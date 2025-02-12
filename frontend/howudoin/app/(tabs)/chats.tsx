import React, { useEffect, useState, useCallback } from 'react';
import { RefreshControl, TextInput } from 'react-native';
import { FlatList, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from "expo-router";
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatList() {
    const router = useRouter();

    interface Chat {
        id: string;
        name: string;
        lastMessage?: string;
        time?: string;
        isGroup: boolean;
        unreadCount?: number;
        isSearchResult?: boolean;
    }
    
    const [chatData, setChatData] = useState<Chat[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        try {
                const token = await AsyncStorage.getItem('token');
                const email = await AsyncStorage.getItem('email');
            // ...existing fetch logic...
            // console.log('Token:', token);
            // console.log('Email:', email);
                
                if (!token) {
                    console.error('No token found');
                    return;
                }
                
                const friendsResponse = await fetch(`http://10.0.2.2:8080/friends?email=${email}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        // 'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
    
                if (friendsResponse.status === 401) {
                    console.error('Unauthorized - Invalid token');
                    return;
                }
    
                const friends = await friendsResponse.json();

                // console.log('Friends:', friends);

                const chatData = [];
    
                for (const friend of friends) {
                    // Get messages where friend is sender
                    const messagesFromFriend = await fetch(
                        `http://10.0.2.2:8080/messages?sender=${friend.email}&receiver=${email}`,
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    
                    // Get messages where friend is receiver
                    const messagesToFriend = await fetch(
                        `http://10.0.2.2:8080/messages?sender=${email}&receiver=${friend.email}`,
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                
                    const fromFriend = await messagesFromFriend.json();
                    console.log('From friend:', fromFriend);
                    const toFriend = await messagesToFriend.json();
                    console.log('To friend:', toFriend);
                    
                    // Combine and sort messages
                    const allMessages = [...fromFriend, ...toFriend].sort((a, b) => 
                        new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime()
                    );
                
                    if (allMessages.length > 0) {
                        const youPrefix = <ThemedText style={{color: '#5c9eff',fontSize: 14}}>You: </ThemedText>;
                        const messageContent = allMessages[0].content;
                        const lastMessage = allMessages[0].sender === email 
                            ? <ThemedView style={{flexDirection: 'row', alignItems: 'center'}}>{youPrefix}<ThemedText style={styles.chatMessage}>{messageContent}</ThemedText></ThemedView>
                            : messageContent;
                        const messageDate = new Date(allMessages[0].sendDate);
                        const today = new Date();
                        
                        const messageTime = messageDate.toDateString() === today.toDateString()
                            ? messageDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            })
                            : messageDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            });
                    
                        // Use email-specific lastSeen key
                        const lastSeenKey = `lastSeen_${email}_for_${friend.email}`;
                        const lastSeen = new Date(await AsyncStorage.getItem(lastSeenKey) || '1970-01-01');
                        // Only count unread messages from friend, not from current user
                        const unreadCount = allMessages.filter(msg => 
                            new Date(msg.sendDate) > lastSeen && 
                            msg.sender === friend.email // Only count messages from friend
                        ).length;
                    
                        chatData.push({
                            id: friend.email,
                            name: friend.fullName,
                            lastMessage,
                            time: messageTime,
                            timestamp: new Date(allMessages[0].sendDate).getTime(), // Store original timestamp
                            isGroup: false,
                            unreadCount,
                        });
                    }
                }

                // After personal chats loop
                const groupsResponse = await fetch(`http://10.0.2.2:8080/groups?email=${email}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const groups = await groupsResponse.json();
                // console.log('Groups:', groups);
                // console.log('------------------------------------------------------------------------');

                for (const group of groups) {
                    const messagesResponse = await fetch(
                        `http://10.0.2.2:8080/groups/${group.groupName}/messages`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    
                    const Messages = await messagesResponse.json();

                    // Combine and sort messages
                    const messages = Messages.sort((a, b) => 
                        new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime()
                    );
                    
                    if (messages.length > 0) {
                        const youPrefix = <ThemedText style={{color: '#5c9eff',fontSize: 14}}>You: </ThemedText>;
                        const messageContent = messages[0].content;
                        const lastMessage = messages[0].sender === email
                            ? <ThemedView style={{flexDirection: 'row', alignItems: 'center'}}>{youPrefix}<ThemedText style={styles.chatMessage}>{messageContent}</ThemedText></ThemedView>
                            : messageContent;

                        const messageDate = new Date(messages[0].sendDate);
                        const today = new Date();
                        
                        const messageTime = messageDate.toDateString() === today.toDateString()
                            ? messageDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            })
                            : messageDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            });

                        // Use email-specific lastSeen key for groups
                        const lastSeenKey = `lastSeen_${email}_for_group_${group.groupName}`;
                        const lastSeen = new Date(await AsyncStorage.getItem(lastSeenKey) || '1970-01-01');
                        // Only count unread messages from others, not from current user
                        const unreadCount = messages.filter((msg: { sendDate: string; sender: string }) => 
                            new Date(msg.sendDate) > lastSeen &&
                            msg.sender !== email // Exclude messages from current user
                        ).length;

                        chatData.push({
                            id: `group_${group.groupName}`,
                            name: group.groupName,
                            lastMessage,
                            time: messageTime,
                            timestamp: new Date(messages[0].sendDate).getTime(), // Store original timestamp
                            isGroup: true,
                            unreadCount,
                        });
                    }
                }

                // Sort using timestamp
                chatData.sort((a, b) => b.timestamp - a.timestamp);

            setChatData(chatData);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const searchMembers = async (query: string) => {
        if (!query) {
            setSearchResults([]);
            return;
        }

        const token = await AsyncStorage.getItem('token');
        const email = await AsyncStorage.getItem('email');
        if (!token || !email) {
            console.log('No token or email found');
            return;
        }

        try {
            // Attempt to fetch friends
            let friends = [];
            try {
                const friendsResponse = await fetch(`http://10.0.2.2:8080/friends?email=${email}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (friendsResponse.ok) {
                    friends = await friendsResponse.json();
                } else {
                    console.log('Failed to fetch friends:', friendsResponse.status);
                }
            } catch (error) {
                console.log('Error fetching friends:', error);
            }

            // Attempt to fetch groups
            let groups = [];
            try {
                const groupsResponse = await fetch(`http://10.0.2.2:8080/groups?email=${email}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (groupsResponse.ok) {
                    groups = await groupsResponse.json();
                } else {
                    console.log('Failed to fetch groups:', groupsResponse.status);
                }
            } catch (error) {
                console.log('Error fetching groups:', error);
            }

            // Process results even if one of the fetches failed
            const filteredFriends = (Array.isArray(friends) ? friends : [])
                .filter((friend: any) => 
                    friend?.fullName?.toLowerCase().includes(query.toLowerCase()) ||
                    friend?.email?.toLowerCase().includes(query.toLowerCase())
                )
                .map((friend: any) => ({
                    id: friend.email,
                    name: friend.fullName,
                    isSearchResult: true,
                    isGroup: false
                }));

            const filteredGroups = (Array.isArray(groups) ? groups : [])
                .filter((group: any) => 
                    group?.groupName?.toLowerCase().includes(query.toLowerCase())
                )
                .map((group: any) => ({
                    id: `group_${group.groupName}`,
                    name: group.groupName,
                    isSearchResult: true,
                    isGroup: true
                }));

            setSearchResults([...filteredFriends, ...filteredGroups]);
        } catch (error) {
            console.log('Search operation failed:', error);
            setSearchResults([]); // Reset results on error
        }
    };

    const filteredChats = chatData.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const allResults = [
        ...(filteredChats || []),
        ...(searchResults || []).filter(result => 
            !filteredChats?.some(chat => 
                (result.isGroup ? 
                    chat.id === result.id : 
                    chat.id === result.id || chat.name === result.name
                )
            )
        )
    ];
    
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [fetchData]);


    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Fetch every 5 seconds

        return () => clearInterval(interval);
    }, [fetchData]);


    const renderChatItem = ({ item }: { item: any }) => (
        <Pressable 
            style={styles.chatItem} 
            onPress={async () => {
                const now = new Date().toISOString();
                const currentEmail = await AsyncStorage.getItem('email');
                if (!currentEmail) return;

                if (item.isGroup) {
                    const lastSeenKey = `lastSeen_${currentEmail}_for_group_${item.name}`;
                    await AsyncStorage.setItem(lastSeenKey, now);
                    await AsyncStorage.setItem(`unreadCount_group_${item.name}`, '0');
                    router.push(`/(conversation)/groupChat?chatId=${encodeURIComponent(item.name)}`);
                } else {
                    const lastSeenKey = `lastSeen_${currentEmail}_for_${item.id}`;
                    await AsyncStorage.setItem(lastSeenKey, now);
                    await AsyncStorage.setItem(`unreadCount_${item.id}`, '0');
                    router.push(`/(conversation)/friendsChat?chatId=${encodeURIComponent(item.id)}`);
                }
            }}
        >
            <ThemedView style={styles.chatLeft}>
                <ThemedView style={styles.chatIcon}>
                    <Image 
                        source={
                            item.isGroup 
                                ? require('@/assets/images/group.png')
                                : require('@/assets/images/user.png')
                        }
                        style={styles.avatar}
                    />
                </ThemedView>
                <ThemedView style={styles.chatDetails}>
                    <ThemedText style={styles.chatName}>{item.name}</ThemedText>
                    {item.unreadCount > 0 ? (
                        <ThemedText style={styles.chatMessageUnread} numberOfLines={1}>
                            {item.lastMessage}
                        </ThemedText>
                    ) : (
                        <ThemedText style={styles.chatMessage} numberOfLines={1}>
                            {item.lastMessage}
                        </ThemedText>
                    )}
                </ThemedView>
            </ThemedView>
            <ThemedView style={styles.chatRight}>
                <ThemedText style={styles.chatTime}>{item.time}</ThemedText>
                {item.unreadCount > 0 && (
                    <ThemedView style={styles.unreadBadge}>
                        <ThemedText style={styles.unreadText}>{item.unreadCount}</ThemedText>
                    </ThemedView>
                )}
            </ThemedView>
        </Pressable>
    );

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search friends or groups..."
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        searchMembers(text);
                    }}
                />
            </ThemedView>
            <FlatList
                data={allResults}
                renderItem={({ item }) => {
                    if (item.isSearchResult) {
                        return (
                            <Pressable 
                                style={styles.chatItem} 
                                onPress={() => {
                                    if (item.isGroup) {
                                        router.push(`/(conversation)/groupChat?chatId=${encodeURIComponent(item.name)}`);
                                    } else {
                                        router.push(`/(conversation)/friendsChat?chatId=${encodeURIComponent(item.id)}`);
                                    }
                                }}
                            >
                                <ThemedView style={styles.chatLeft}>
                                    <ThemedView style={styles.chatIcon}>
                                        <Image 
                                            source={
                                                item.isGroup 
                                                    ? require('@/assets/images/group.png')
                                                    : require('@/assets/images/user.png')
                                            }
                                            style={styles.avatar}
                                        />
                                    </ThemedView>
                                    <ThemedView style={styles.chatDetails}>
                                        <ThemedText style={styles.chatName}>{item.name}</ThemedText>
                                        <ThemedText style={styles.chatMessage}>
                                            {item.isGroup ? 'Group Chat' : item.id}
                                        </ThemedText>
                                    </ThemedView>
                                </ThemedView>
                            </Pressable>
                        );
                    }
                    return renderChatItem({ item });
                }}
                keyExtractor={item => (item.isSearchResult ? `search_${item.id}` : item.id)}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#fff"
                    />
                }
                ListEmptyComponent={
                    <ThemedView style={{ padding: 20 }}>
                        <ThemedText style={styles.emptyText}>No chats found</ThemedText>
                    </ThemedView>
                }
            />
        </ThemedView>
    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
        // Remove backgroundColor
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#202225',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    listContent: {
        paddingBottom: 20,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        // Remove backgroundColor
    },
    chatLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatIcon: {
        height: 50,
        width: 50,
        borderRadius: 25,
        overflow: 'hidden',
        backgroundColor: '#333',  // Lighter shade for icon background
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    chatDetails: {
        marginLeft: 10,
    },
    chatName: {
        fontSize: 16,
        fontWeight: 'bold',
        // Remove color
    },
    chatMessage: {
        fontSize: 14,
        color: '#666',  // Subdued text color
    },
    chatMessageUnread: {
        fontSize: 14,
        fontWeight: '500',  // Slightly bolder for unread messages
        color: '#fff',  // White text color
    },
    chatRight: {
        alignItems: 'flex-end',
    },
    chatTime: {
        fontSize: 12,
        color: '#666',  // Subdued text color
    },
    unreadBadge: {
        marginTop: 5,
        backgroundColor: '#5c9eff',  // Match the theme blue color
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    unreadText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
    },
    bottomTab: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#202225',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    searchContainer: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    searchInput: {
        height: 40,
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 20,
        paddingHorizontal: 15,
        color: '#666',
        backgroundColor: '#ffffff11',
    },
});