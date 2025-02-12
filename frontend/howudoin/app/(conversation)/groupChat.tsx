import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TextInput, FlatList, Pressable, View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
    groupChat: {
        chatId: string;
    };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'groupChat'>;

interface Message {
    sender: string;
    sendDate: string; // Changed from timestamp to sendDate
    content: string;
}

interface UserNameMap {
    [email: string]: string;
}

interface UserInfo {
    fullName: string;
    email: string;
}

const getMessageTime = (sendDate: string) => {
    try {
        const date = new Date(sendDate);
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

// Add debug flag at the top
const DEBUG = true;
const log = (message: string, data?: any) => {
    if (DEBUG) console.log(`[GroupChat] ${message}:`, data || '');
};

export default function GroupChat() {
    const route = useRoute<ChatScreenRouteProp>();
    const navigation = useNavigation();
    
    // Simplified parameter validation
    useEffect(() => {
        if (!route.params?.chatId) {
            // log('Missing route params', route.params);
            navigation.goBack();
            return;
        }
    }, [route.params, navigation]);

    if (!route.params?.chatId) {
        return (
            <ThemedView style={styles.container}>
                <ThemedText>Invalid group parameters</ThemedText>
            </ThemedView>
        );
    }

    const chatId = route.params.chatId;
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const [userNames, setUserNames] = useState<UserNameMap>({});

    // Add effect to load user email
    useEffect(() => {
        AsyncStorage.getItem('email').then(email => {
            if (email) setCurrentUserEmail(email);
        });
    }, []);

    const fetchUserNames = useCallback(async (emails: string[]) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const currentEmail = await AsyncStorage.getItem('email');
            if (!token || !currentEmail) {
                console.log('Missing token or email in fetchUserNames');
                return;
            }

            const uniqueEmails = [...new Set(emails)];
            const promises = uniqueEmails.map(email =>
                fetch(`http://10.0.2.2:8080/search/members`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: currentEmail,
                        receiver: email
                    })
                })
                .then(res => res.json())
                .then((users: UserInfo[]) => {
                    if (users && users.length > 0) {
                        return { email, fullName: users[0].fullName };
                    }
                    return { email, fullName: email };
                })
            );

            const results = await Promise.all(promises);
            const nameMap: UserNameMap = {};
            results.forEach(result => {
                nameMap[result.email] = result.fullName;
            });
            setUserNames(nameMap);
        } catch (error) {
            console.log('Error in fetchUserNames:', error);
        }
    }, []);

    const fetchMessages = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const email = await AsyncStorage.getItem('email');

            if (!token || !email) {
                console.log('Missing token or email in fetchMessages');
                return;
            }

            const response = await fetch(`http://10.0.2.2:8080/groups/${encodeURIComponent(chatId)}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).catch(error => {
                console.log('Network request failed:', error);
                return null;
            });

            if (!response) {
                console.log('No response from server');
                return;
            }

            if (!response.ok) {
                console.log('Server responded with error:', response.status);
                return;
            }

            const responseText = await response.text();
            const data = JSON.parse(responseText);
            const sortedMessages = data.sort((a: Message, b: Message) => 
                new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime()
            );
            
            setMessages(sortedMessages);

            // Get unique emails and fetch names
            const emails = [...new Set(sortedMessages.map((msg: Message) => msg.sender))] as string[];
            fetchUserNames(emails);
        } catch (error) {
            console.log('Error in fetchMessages:', error);
        }
    }, [chatId, fetchUserNames]);

    const sendMessage = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const sender = await AsyncStorage.getItem('email');
            if (!token || !sender || !newMessage.trim()) {
                console.log('Missing data for sending message');
                return;
            }

            const response = await fetch(`http://10.0.2.2:8080/groups/${encodeURIComponent(chatId)}/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender,
                    content: newMessage.trim()
                })
            });

            if (response.ok) {
                setNewMessage('');
                fetchMessages();
            } else {
                console.log('Failed to send message:', response.status);
            }
        } catch (error) {
            console.log('Error in sendMessage:', error);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [fetchMessages]);

    const renderMessage = ({ item }: { item: Message }) => {
        const isCurrentUser = item.sender === currentUserEmail;
        const displayName = isCurrentUser ? 'You' : (userNames[item.sender] || item.sender);
        
        return (
            <View style={[
                styles.messageContainer,
                isCurrentUser ? styles.sentMessage : styles.receivedMessage
            ]}>
                {/* Show sender's email for received messages in group chat */}
                {!isCurrentUser && (
                    <ThemedText style={styles.senderText}>{displayName}</ThemedText>
                )}
                <ThemedText style={styles.messageText}>{item.content}</ThemedText>
                <ThemedText style={styles.timestamp}>
                    {getMessageTime(item.sendDate)}
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
                <ThemedText style={styles.headerText}>{chatId}</ThemedText>
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
        // Remove backgroundColor
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        // Remove color
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
        backgroundColor: '#5c9eff', // Match theme blue color
    },
    receivedMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#444', // Subdued background
    },
    messageText: {
        fontSize: 16,
        // Remove color
    },
    timestamp: {
        fontSize: 12,
        color: '#666', // Subdued text
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
        backgroundColor: '#5c9eff', // Match theme blue color
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        justifyContent: 'center',
    },
    sendButtonText: {
        fontWeight: 'bold',
        // Remove color
    },
    senderText: {
        fontSize: 12,
        color: '#5c9eff',
        marginBottom: 4,
        fontWeight: 'bold', // Make names stand out more
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
});
