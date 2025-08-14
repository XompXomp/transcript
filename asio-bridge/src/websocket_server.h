#pragma once

#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>
#include <functional>
#include <string>
#include <vector>
#include <map>
#include <mutex>
#include <thread>
#include <atomic>

typedef websocketpp::server<websocketpp::config::asio> WebSocketServer;
typedef websocketpp::connection_hdl ConnectionHandle;

struct ChannelSubscription {
    int channelId;
    std::string channelName;
    bool isActive;
};

class WebSocketServerManager {
public:
    WebSocketServerManager();
    ~WebSocketServerManager();

    // Initialize and start the server
    bool start(int port = 8080);
    
    // Stop the server
    void stop();
    
    // Send audio data to subscribed clients
    void sendAudioData(int channelId, const std::vector<float>& samples, double timestamp);
    
    // Send channel list to clients
    void sendChannelList(const std::vector<std::string>& channels);
    
    // Set callback for subscription changes
    void setSubscriptionCallback(std::function<void(int, bool)> callback);
    
    // Check if server is running
    bool isRunning() const { return m_isRunning; }
    
    // Get current subscriptions
    std::vector<ChannelSubscription> getSubscriptions() const;

private:
    // WebSocket event handlers
    void onOpen(ConnectionHandle hdl);
    void onClose(ConnectionHandle hdl);
    void onMessage(ConnectionHandle hdl, WebSocketServer::message_ptr msg);
    void onError(ConnectionHandle hdl);

    // Message handling
    void handleSubscribe(ConnectionHandle hdl, const std::string& message);
    void handleUnsubscribe(ConnectionHandle hdl, const std::string& message);
    void handleGetChannels(ConnectionHandle hdl);
    void handleGetDevices(ConnectionHandle hdl);

    // Internal methods
    void broadcastToSubscribers(const std::string& message);
    void sendToClient(ConnectionHandle hdl, const std::string& message);
    void runServer();

    // WebSocket server
    WebSocketServer m_server;
    std::thread m_serverThread;
    std::atomic<bool> m_isRunning;
    
    // Connection management
    std::map<ConnectionHandle, std::vector<int>, std::owner_less<ConnectionHandle>> m_connections;
    mutable std::mutex m_connectionsMutex;
    
    // Subscription management
    std::map<int, std::vector<ConnectionHandle>> m_channelSubscriptions;
    mutable std::mutex m_subscriptionsMutex;
    
    // Callbacks
    std::function<void(int, bool)> m_subscriptionCallback;
    mutable std::mutex m_callbackMutex;
    
    // Available channels (cached)
    std::vector<std::string> m_availableChannels;
    mutable std::mutex m_channelsMutex;
};
