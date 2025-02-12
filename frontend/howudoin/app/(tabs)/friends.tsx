import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Pressable, Image, TextInput, RefreshControl, TouchableOpacity, Alert, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';

type RootStackParamList = {
    friendDetails: { friendId: string };
    friendsChat: { friendId: string, friendName: string }; // Add friendsChat route
    // ... other routes
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Update the Friend interface to match API response
interface Friend {
    fullName: string;
    email: string;
    requestSent?: boolean;
}

// Add a helper function at the top of the file
const getUniqueKey = (item: Friend) => {
    if (!item) return Math.random().toString();
    return item.email || Math.random().toString();
};

const getSafeName = (item: Friend) => {
    if (!item) return 'Unknown User';
    return item.fullName || 'Unknown User';
};

export default function FriendsList() {
    const navigation = useNavigation<NavigationProp>();
    const [friendsData, setFriendsData] = useState<Friend[]>([]);
    const [searchResults, setSearchResults] = useState<Friend[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('friends');
    const [friendRequests, setFriendRequests] = useState<Friend[]>([]); // New state for friend requests

    // Update fetchFriends to use the correct response structure
    const fetchFriends = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const email = await AsyncStorage.getItem('email');
            if (!token || !email) return;

            const response = await fetch(`http://10.0.2.2:8080/friends?email=${email}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const friends = await response.json();
                // No need to map the response anymore as it matches our interface
                setFriendsData(friends);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    const searchFriends = useCallback(async (receiver: string) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const sender = await AsyncStorage.getItem('email');
            if (!token || !sender) return;

            const response = await fetch(`http://10.0.2.2:8080/search/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sender, receiver })
            });

            if (response.ok) {
                const results = await response.json();
                setSearchResults(results);
            }
            // console.log('Search results:', searchResults);
        } catch (error) {
            console.error(error);
        }
    }, [setSearchResults]);

    const sendFriendRequest = async (receiver: string) => {
        if (!receiver) {
            console.error('No receiver email provided');
            return;
        }
        try {
            const token = await AsyncStorage.getItem('token');
            const sender = await AsyncStorage.getItem('email');
            
            if (!token || !sender) {
                console.error('Missing token or sender email');
                return;
            }

            const response = await fetch('http://10.0.2.2:8080/friends/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sender, receiver })
            });

            const responseText = await response.text();
            
            if (response.ok) {
                // console.log('Friend request response:', responseText);
                setSearchResults(prev => 
                    prev.map(user => 
                        user.email === receiver 
                            ? { ...user, requestSent: true }
                            : user
                    )
                );
            } else {
                // Show error message from server
                Alert.alert('Cannot Send Request', responseText);
            }
        } catch (error) {
            console.error('Network request failed:', error);
            Alert.alert('Error', 'Failed to send friend request. Please try again.');
        }
    };

    // Update fetchFriendRequests similarly
    const fetchFriendRequests = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const email = await AsyncStorage.getItem('email');
            if (!token || !email) return;

            const response = await fetch(`http://10.0.2.2:8080/friend/requests?email=${email}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const requests = await response.json();
                // No mapping needed, just set the requests directly
                setFriendRequests(requests);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    const acceptFriendRequest = async (sender: string) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const receiver = await AsyncStorage.getItem('email');
            
            if (!token || !receiver) {
                console.error('Missing token or receiver email');
                return;
            }

            const response = await fetch('http://10.0.2.2:8080/friends/accept', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sender, receiver })
            });

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.text(); // Handle plain text response
            // console.log('Accept friend request response:', responseData);

            setFriendRequests(prev => 
                prev.filter(request => request.email !== sender)
            );
            fetchFriends(); // Refresh friends list
        } catch (error) {
            console.error('Network request failed:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'friends') {
            fetchFriends();
        } else if (activeTab === 'search' && searchQuery) {
            searchFriends(searchQuery);
        } else if (activeTab === 'requests') {
            fetchFriendRequests();
        }
    }, [activeTab, searchQuery, fetchFriends, searchFriends, fetchFriendRequests]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchFriends();
        setRefreshing(false);
    }, [fetchFriends]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    useEffect(() => {
        if (searchQuery) {
            searchFriends(searchQuery);
        } else {
            fetchFriends();
        }
    }, [searchQuery, searchFriends, fetchFriends]);

    // Update handleFriendSelect to use fullName instead of name
    const handleFriendSelect = (friend: Friend) => {
        if (!friend || !friend.email) return;
        router.push('/chats')
    };

    // Update renderFriendItem to use only fullName
    const renderFriendItem = ({ item }: { item: Friend }) => {
        if (!item) return null;
        return (
            <TouchableOpacity 
                style={styles.friendItem} 
                onPress={() => handleFriendSelect(item)}
            >
                <ThemedView style={styles.friendLeft}>
                    <ThemedView style={styles.friendIcon}>
                        <Image 
                            source={require('@/assets/images/user.png')}
                            style={styles.avatar}
                        />
                    </ThemedView>
                    <ThemedView style={styles.friendDetails}>
                        <ThemedText style={[styles.friendName]}>{getSafeName(item)}</ThemedText>
                        <ThemedText style={[styles.friendEmail]}>{item.email || 'No email'}</ThemedText>
                    </ThemedView>
                </ThemedView>
            </TouchableOpacity>
        );
    };

    const renderSearchItem = ({ item }: { item: Friend }) => (
        <Pressable style={styles.friendItem}>
            <ThemedView style={styles.friendLeft}>
                <ThemedView style={styles.friendIcon}>
                    <Image 
                        source={
                        require('@/assets/images/user.png')
                        }
                        style={styles.avatar}
                    />
                </ThemedView>
                <ThemedView style={styles.friendDetails}>
                    <ThemedText style={styles.friendName}>{item.fullName}</ThemedText>
                    <ThemedText style={styles.friendEmail}>{item.email}</ThemedText>
                </ThemedView>
            </ThemedView>
            <Pressable 
                style={[styles.addButton, item.requestSent && styles.addButtonSent]}
                onPress={() => sendFriendRequest(item.email)}
                disabled={item.requestSent}
            >
                <ThemedText style={styles.addButtonText}>
                    {item.requestSent ? 'Request Sent' : 'Add Friend'}
                </ThemedText>
            </Pressable>
        </Pressable>
    );

    const renderFriendRequestItem = ({ item }: { item: Friend }) => (
        <Pressable style={styles.friendItem}>
            <ThemedView style={styles.friendLeft}>
                <ThemedView style={styles.friendIcon}>
                    <Image 
                        source={require('@/assets/images/user.png')}
                        style={styles.avatar}
                    />
                </ThemedView>
                <ThemedView style={styles.friendDetails}>
                    <ThemedText style={styles.friendName}>{item.fullName}</ThemedText>
                    <ThemedText style={styles.friendEmail}>{item.email}</ThemedText>
                </ThemedView>
            </ThemedView>
            <Pressable 
                style={styles.addButton}
                onPress={() => acceptFriendRequest(item.email)}
            >
                <ThemedText style={styles.addButtonText}>Accept</ThemedText>
            </Pressable>
        </Pressable>
    );

    const renderFriendsTab = () => (
        <ThemedView style={{ flex: 1 }}>
            <FlatList
                data={friendsData.filter(friend => friend != null)}  // Filter out null items
                renderItem={renderFriendItem}
                keyExtractor={getUniqueKey}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <ThemedView style={{ padding: 20 }}>
                        <ThemedText style={styles.emptyText}>No friends found</ThemedText>
                    </ThemedView>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
            />
        </ThemedView>
    );

    const renderSearchTab = () => (
        <ThemedView style={{ flex: 1 }}>
            <TextInput
                style={styles.searchBar}
                placeholder="Search Users by email address..."
                placeholderTextColor="#666"  // Changed from #ccc to #666
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            <FlatList
                data={searchResults}
                renderItem={renderSearchItem}
                keyExtractor={getUniqueKey}
                contentContainerStyle={styles.listContent}
            />
        </ThemedView>
    );

    const renderFriendRequestsTab = () => (
        <FlatList
            data={friendRequests}
            renderItem={renderFriendRequestItem}
            keyExtractor={getUniqueKey}
            contentContainerStyle={styles.listContent}
        />
    );

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.tabContainer}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={setActiveTab}
                    buttons={[
                        { 
                            value: 'friends', 
                            label: 'Friends',
                            labelStyle: styles.segmentButtonLabel,
                            style: activeTab === 'friends' ? styles.selectedSegmentButton : null
                        },
                        { 
                            value: 'search', 
                            label: 'Send Requests',
                            labelStyle: styles.segmentButtonLabel,
                            style: activeTab === 'search' ? styles.selectedSegmentButton : null
                        },
                        { 
                            value: 'requests', 
                            label: 'Accept',
                            labelStyle: styles.segmentButtonLabel,
                            style: activeTab === 'requests' ? styles.selectedSegmentButton : null
                        },
                    ]}
                    style={[styles.segmentedControl, { backgroundColor: 'transparent' }]}
                />
            </ThemedView>
            {activeTab === 'friends' ? renderFriendsTab() : activeTab === 'search' ? renderSearchTab() : renderFriendRequestsTab()}
        </ThemedView>
    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
        // Remove backgroundColor as it will be handled by ThemedView
    },
    tabContainer: {
        marginBottom: 10,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
    },
    searchBar: {
        height: 40,
        borderColor: '#333',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        margin: 10,
        color: '#666',  // Changed from #fff to #666
    },
    listContent: {
        paddingBottom: 20,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        // Remove any backgroundColor
    },
    friendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    friendIcon: {
        height: 50,
        width: 50,
        borderRadius: 25,
        overflow: 'hidden',
        backgroundColor: '#333',  // Lighter shade for icon background
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    friendDetails: {
        marginLeft: 10,
    },
    friendName: {
        fontSize: 16,
        // color: '#fff',
        fontWeight: 'bold',
    },
    friendEmail: {
        fontSize: 14,
        // color: '#ccc',
    },
    segmentedControl: {
        margin: 10,
        backgroundColor: 'transparent',
    },
    segmentButtonLabel: {
        color: '#5c9eff',  // Light blue color
    },
    selectedSegmentButton: {
        backgroundColor: '#4a4a4a',  // Very light grey color for selected state
    },
    addButton: {
        backgroundColor: '#5c9eff',  // Match the groups.tsx blue color
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonSent: {
        backgroundColor: '#43B581',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});