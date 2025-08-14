#include "websocket_server.h"
#include <iostream>
#include <sstream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

WebSocketServerManager::WebSocketServerManager() 
    : m_isRunning(false) {
    
    // Setup WebSocket server
    m_server.set_access_channels(websocketpp::log::alevel::none);
    m_server.set_error_channels(websocketpp::log::elevel::fatal);
    
    // Set up handlers
    m_server.set_open_handler(std::bind(&WebSocketServerManager::onOpen, this, std::placeholders::_1));
    m_server.set_close_handler(std::bind(&WebSocketServerManager::onClose, this, std::placeholders::_1));
    m_server.set_message_handler(std::bind(&WebSocketServerManager::onMessage, this, std::placeholders::_1, std::placeholders::_2));
    m_server.set_fail_handler(std::bind(&WebSocketServerManager::onError, this, std::placeholders::_1));
    
    // Initialize ASIO
    m_server.init_asio();
}

WebSocketServerManager::~WebSocketServerManager() {
    stop();
}

bool WebSocketServerManager::start(int port) {
    if (m_isRunning) {
        return true;
    }
    
    try {
        m_server.listen(port);
        m_server.start_accept();
        
        m_isRunning = true;
        m_serverThread = std::thread(&WebSocketServerManager::runServer, this);
        
        std::cout << "WebSocket server started on port " << port << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Failed to start WebSocket server: " << e.what() << std::endl;
        return false;
    }
}

void WebSocketServerManager::stop() {
    if (!m_isRunning) {
        return;
    }
    
    m_isRunning = false;
    
    try {
        m_server.stop_listening();
        
        // Close all connections
        std::lock_guard<std::mutex> lock(m_connectionsMutex);
        for (auto& conn : m_connections) {
            m_server.close(conn.first, websocketpp::close::status::normal, "Server shutdown");
        }
        m_connections.clear();
        
        if (m_serverThread.joinable()) {
            m_serverThread.join();
        }
        
        std::cout << "WebSocket server stopped" << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error stopping WebSocket server: " << e.what() << std::endl;
    }
}

void WebSocketServerManager::sendAudioData(int channelId, const std::vector<float>& samples, double timestamp) {
    json audioMessage = {
        {"type", "audio"},
        {"channelId", channelId},
        {"samples", samples},
        {"timestamp", timestamp},
        {"sampleRate", 24000} // Target sample rate for STT
    };
    
    std::string message = audioMessage.dump();
    
    // Send to all subscribers of this channel
    std::lock_guard<std::mutex> lock(m_subscriptionsMutex);
    auto it = m_channelSubscriptions.find(channelId);
    if (it != m_channelSubscriptions.end()) {
        for (const auto& hdl : it->second) {
            try {
                m_server.send(hdl, message, websocketpp::frame::opcode::text);
            } catch (const std::exception& e) {
                std::cerr << "Failed to send audio data: " << e.what() << std::endl;
            }
        }
    }
}

void WebSocketServerManager::sendChannelList(const std::vector<std::string>& channels) {
    std::lock_guard<std::mutex> lock(m_channelsMutex);
    m_availableChannels = channels;
    
    json channelList = {
        {"type", "channelList"},
        {"channels", channels}
    };
    
    std::string message = channelList.dump();
    broadcastToSubscribers(message);
}

void WebSocketServerManager::setSubscriptionCallback(std::function<void(int, bool)> callback) {
    std::lock_guard<std::mutex> lock(m_callbackMutex);
    m_subscriptionCallback = callback;
}

std::vector<ChannelSubscription> WebSocketServerManager::getSubscriptions() const {
    std::vector<ChannelSubscription> subscriptions;
    
    std::lock_guard<std::mutex> lock(m_subscriptionsMutex);
    for (const auto& pair : m_channelSubscriptions) {
        ChannelSubscription sub;
        sub.channelId = pair.first;
        sub.isActive = !pair.second.empty();
        subscriptions.push_back(sub);
    }
    
    return subscriptions;
}

void WebSocketServerManager::onOpen(ConnectionHandle hdl) {
    std::cout << "New WebSocket connection opened" << std::endl;
    
    // Send current channel list
    std::lock_guard<std::mutex> lock(m_channelsMutex);
    if (!m_availableChannels.empty()) {
        json channelList = {
            {"type", "channelList"},
            {"channels", m_availableChannels}
        };
        sendToClient(hdl, channelList.dump());
    }
}

void WebSocketServerManager::onClose(ConnectionHandle hdl) {
    std::cout << "WebSocket connection closed" << std::endl;
    
    // Remove from all subscriptions
    std::lock_guard<std::mutex> lock(m_subscriptionsMutex);
    for (auto& pair : m_channelSubscriptions) {
        auto& subscribers = pair.second;
        subscribers.erase(std::remove(subscribers.begin(), subscribers.end(), hdl), subscribers.end());
    }
    
    // Remove from connections
    std::lock_guard<std::mutex> connLock(m_connectionsMutex);
    m_connections.erase(hdl);
}

void WebSocketServerManager::onMessage(ConnectionHandle hdl, WebSocketServer::message_ptr msg) {
    try {
        json message = json::parse(msg->get_payload());
        std::string type = message["type"];
        
        if (type == "subscribe") {
            handleSubscribe(hdl, msg->get_payload());
        } else if (type == "unsubscribe") {
            handleUnsubscribe(hdl, msg->get_payload());
        } else if (type == "getChannels") {
            handleGetChannels(hdl);
        } else if (type == "getDevices") {
            handleGetDevices(hdl);
        } else {
            std::cerr << "Unknown message type: " << type << std::endl;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error parsing message: " << e.what() << std::endl;
    }
}

void WebSocketServerManager::onError(ConnectionHandle hdl) {
    std::cerr << "WebSocket error occurred" << std::endl;
}

void WebSocketServerManager::handleSubscribe(ConnectionHandle hdl, const std::string& message) {
    try {
        json msg = json::parse(message);
        int channelId = msg["channelId"];
        
        // Add to subscriptions
        std::lock_guard<std::mutex> lock(m_subscriptionsMutex);
        m_channelSubscriptions[channelId].push_back(hdl);
        
        // Add to connections
        std::lock_guard<std::mutex> connLock(m_connectionsMutex);
        m_connections[hdl].push_back(channelId);
        
        // Notify callback
        std::lock_guard<std::mutex> callbackLock(m_callbackMutex);
        if (m_subscriptionCallback) {
            m_subscriptionCallback(channelId, true);
        }
        
        // Send confirmation
        json response = {
            {"type", "subscribed"},
            {"channelId", channelId}
        };
        sendToClient(hdl, response.dump());
        
        std::cout << "Client subscribed to channel " << channelId << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error handling subscribe: " << e.what() << std::endl;
    }
}

void WebSocketServerManager::handleUnsubscribe(ConnectionHandle hdl, const std::string& message) {
    try {
        json msg = json::parse(message);
        int channelId = msg["channelId"];
        
        // Remove from subscriptions
        std::lock_guard<std::mutex> lock(m_subscriptionsMutex);
        auto it = m_channelSubscriptions.find(channelId);
        if (it != m_channelSubscriptions.end()) {
            auto& subscribers = it->second;
            subscribers.erase(std::remove(subscribers.begin(), subscribers.end(), hdl), subscribers.end());
            
            // If no more subscribers, notify callback
            if (subscribers.empty()) {
                std::lock_guard<std::mutex> callbackLock(m_callbackMutex);
                if (m_subscriptionCallback) {
                    m_subscriptionCallback(channelId, false);
                }
            }
        }
        
        // Remove from connections
        std::lock_guard<std::mutex> connLock(m_connectionsMutex);
        auto connIt = m_connections.find(hdl);
        if (connIt != m_connections.end()) {
            auto& channels = connIt->second;
            channels.erase(std::remove(channels.begin(), channels.end(), channelId), channels.end());
        }
        
        // Send confirmation
        json response = {
            {"type", "unsubscribed"},
            {"channelId", channelId}
        };
        sendToClient(hdl, response.dump());
        
        std::cout << "Client unsubscribed from channel " << channelId << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error handling unsubscribe: " << e.what() << std::endl;
    }
}

void WebSocketServerManager::handleGetChannels(ConnectionHandle hdl) {
    std::lock_guard<std::mutex> lock(m_channelsMutex);
    json response = {
        {"type", "channelList"},
        {"channels", m_availableChannels}
    };
    sendToClient(hdl, response.dump());
}

void WebSocketServerManager::handleGetDevices(ConnectionHandle hdl) {
    // This would typically return ASIO device list
    // For now, return empty list
    json response = {
        {"type", "deviceList"},
        {"devices", json::array()}
    };
    sendToClient(hdl, response.dump());
}

void WebSocketServerManager::broadcastToSubscribers(const std::string& message) {
    std::lock_guard<std::mutex> lock(m_connectionsMutex);
    for (const auto& conn : m_connections) {
        try {
            m_server.send(conn.first, message, websocketpp::frame::opcode::text);
        } catch (const std::exception& e) {
            std::cerr << "Failed to broadcast message: " << e.what() << std::endl;
        }
    }
}

void WebSocketServerManager::sendToClient(ConnectionHandle hdl, const std::string& message) {
    try {
        m_server.send(hdl, message, websocketpp::frame::opcode::text);
    } catch (const std::exception& e) {
        std::cerr << "Failed to send message to client: " << e.what() << std::endl;
    }
}

void WebSocketServerManager::runServer() {
    try {
        m_server.run();
    } catch (const std::exception& e) {
        std::cerr << "WebSocket server error: " << e.what() << std::endl;
    }
}
