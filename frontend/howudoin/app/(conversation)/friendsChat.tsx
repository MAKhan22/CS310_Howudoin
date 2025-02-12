import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TextInput, FlatList, Pressable, View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RouteProp } from '@react-navigation/native';

// Add debug flag at the top
const DEBUG = true;
const log = (message: string, data?: any) => {
    if (DEBUG) console.log(`[FriendsChat] ${message}:`, data || '');
};

type RootStackParamList = {
    friendsChat: {
        chatId: string;
    };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'friendsChat'>;

interface Message {
    sender: string;
    sendDate: string; // Changed from timestamp to sendDate
    content: string;
}

interface UserInfo {
    fullName: string;
    email: string;
}

interface UserNameMap {
    [email: string]: string;
}

const getMessageTime = (timestamp: string) => {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return '';
    }
};

const formatMessageDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

export default function FriendsChat() {
    const route = useRoute<ChatScreenRouteProp>();
    const navigation = useNavigation();
    
    // Enhanced parameter validation
    useEffect(() => {
        if (!route.params?.chatId) {
            // log('Invalid or missing route params', route.params);
            navigation.goBack();
            return;
        }
    }, [route.params, navigation]);

    // Guard clause for the entire component
    if (!route.params?.chatId) {
        return (
            <ThemedView style={styles.container}>
                <ThemedText>Invalid chat parameters</ThemedText>
            </ThemedView>
        );
    }

    const chatId = route.params.chatId;
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const [receiverName, setReceiverName] = useState<string>(chatId);

    // Add effect to load user email and fetch receiver name
    useEffect(() => {
        AsyncStorage.getItem('email').then(email => {
            if (email) {
                setCurrentUserEmail(email);
                fetchReceiverName(email, chatId);
            }
        });
    }, [chatId]);

    const fetchReceiverName = async (currentEmail: string, receiverEmail: string) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const response = await fetch('http://10.0.2.2:8080/search/members', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender: currentEmail,
                    receiver: receiverEmail
                })
            });

            if (response.ok) {
                const users: UserInfo[] = await response.json();
                if (users && users.length > 0) {
                    setReceiverName(users[0].fullName);
                }
            }
        } catch (error) {
            log('Error fetching receiver name', error);
        }
    };

    // Update fetchMessages function
    const fetchMessages = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const email = await AsyncStorage.getItem('email');

            if (!token || !email || !chatId) {
                console.log('Missing required data');
                return;
            }

            // Fetch messages in both directions
            const fromFriendResponse = await fetch(
                `http://10.0.2.2:8080/messages?sender=${encodeURIComponent(chatId)}&receiver=${encodeURIComponent(email)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const toFriendResponse = await fetch(
                `http://10.0.2.2:8080/messages?sender=${encodeURIComponent(email)}&receiver=${encodeURIComponent(chatId)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // log('Response statuses', {
            //     fromFriend: fromFriendResponse.status,
            //     toFriend: toFriendResponse.status
            // });

            const fromFriendText = await fromFriendResponse.text();
            const toFriendText = await toFriendResponse.text();
            
            // log('Response bodies', {
            //     fromFriend: fromFriendText,
            //     toFriend: toFriendText
            // });

            if (fromFriendResponse.ok && toFriendResponse.ok) {
                const fromFriendMessages = JSON.parse(fromFriendText);
                const toFriendMessages = JSON.parse(toFriendText);
                
                // Combine and sort messages using sendDate
                const allMessages = [...fromFriendMessages, ...toFriendMessages]
                    .sort((a, b) => new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime());
                
                // log('Combined messages', allMessages);
                setMessages(allMessages);
            }
        } catch (error) {
            console.log('Error fetching messages:', error);
        }
    }, [chatId]);

    const sendMessage = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const sender = await AsyncStorage.getItem('email');
            if (!token || !sender || !newMessage.trim()) return;

            const response = await fetch('http://10.0.2.2:8080/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender,
                    receiver: chatId,
                    content: newMessage.trim()
                })
            });

            if (response.ok) {
                setNewMessage('');
                fetchMessages();
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // Update renderMessage
    const renderMessage = ({ item }: { item: Message }) => {
        // log('Rendering message', { ...item, isCurrentUser: item.sender === currentUserEmail });
        
        return (
            <View style={[
                styles.messageContainer,
                item.sender === currentUserEmail ? styles.sentMessage : styles.receivedMessage
            ]}>
                <ThemedText style={styles.messageText}>{item.content}</ThemedText>
                <ThemedText style={styles.timestamp}>
                    {getMessageTime(item.sendDate)} {/* Changed from timestamp to sendDate */}
                </ThemedText>
            </View>
        );
    };

    const renderItem = ({ item, index }: { item: Message, index: number }) => {
        const currentDate = new Date(item.sendDate).toDateString();
        const prevMessageDate = index < messages.length - 1 
            ? new Date(messages[index + 1].sendDate).toDateString()
            : null;
        const isFirstMessageOfDay = currentDate !== prevMessageDate;

        return (
            <View>
                {isFirstMessageOfDay && (
                    <ThemedView style={styles.dateSeparatorContainer}>
                        <ThemedText style={styles.dateSeparatorText}>
                            {formatMessageDate(new Date(item.sendDate))}
                        </ThemedText>
                    </ThemedView>
                )}
                {renderMessage({ item })}
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
                <ThemedView style={styles.headerContent}>
                    <ThemedText style={styles.headerText}>{receiverName}</ThemedText>
                    <ThemedText style={styles.emailText}>{chatId}</ThemedText>
                </ThemedView>
            </ThemedView>
            <FlatList
                data={messages}
                renderItem={renderItem}
                keyExtractor={() => Math.random().toString()}
                contentContainerStyle={styles.messagesList}
                inverted
            />
            <ThemedView style={styles.inputContainer}>
                <ThemedView style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type a message..."
                        placeholderTextColor="#666"
                    />
                </ThemedView>
                <Pressable style={styles.sendButton} onPress={sendMessage}>
                    <ThemedText style={styles.sendButtonText}>Send</ThemedText>
                </Pressable>
            </ThemedView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Add this to space items apart
        width: '100%', // Ensure full width
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    messagesList: {
        padding: 16,
    },
    messageContainer: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginVertical: 4,
    },
    sentMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#5c9eff',
    },
    receivedMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#444',
    },
    messageText: {
        fontSize: 16,
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
        marginRight: 8,
        overflow: 'hidden',
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        color: '#666',
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: '#5c9eff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        justifyContent: 'center',
    },
    sendButtonText: {
        fontWeight: 'bold',
    },
    dateSeparatorContainer: {
        alignItems: 'center',
        marginVertical: 8,
    },
    dateSeparatorText: {
        fontSize: 12,
        color: '#5c9eff',
        backgroundColor: '#444',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    emailText: {
        fontSize: 14,
        color: '#666',
        flexShrink: 1, // Allow text to shrink if needed
    },
});
