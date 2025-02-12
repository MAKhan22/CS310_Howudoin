import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Pressable, TextInput, RefreshControl, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SegmentedButtons } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

const DEBUG = true; // Add this at the top of the file

const logDebug = (message: string, data?: any) => {
    if (DEBUG) {
        console.log(`[DEBUG] ${message}`, data || '');
    }
};

const handleError = (error: any, operation: string, showAlert = false) => {
    const errorMessage = error?.message || 'Unknown error occurred';
    console.log(`Error in ${operation}:`, errorMessage);
    if (showAlert) {
        Alert.alert(
            'Error',
            `Something went wrong. Please try again.`
        );
    }
};

type RootStackParamList = {
    groupDetails: { groupId: string };
    groupChat: { groupId: string; groupName: string };
    // ... other routes
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface GroupMember {
    fullName: string;
    email: string;
}

interface GroupDetailsResponse {
    groupName: string;
    "Date of creation": string;
    members: GroupMember[];
}

interface Group {
    id: string;
    name: string;
    createdAt: string;
    members: GroupMember[];
}

interface SearchResultMember {
    fullName: string;
    email: string;
}

// Add new interface for selected members
interface SelectedMember {
    fullName: string;
    email: string;
}

export default function Groups() {
    const navigation = useNavigation<NavigationProp>();
    const [groupsData, setGroupsData] = useState<Group[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupMembers, setGroupMembers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResultMember[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('groups');
    const [selectedMembers, setSelectedMembers] = useState<Map<string, SelectedMember>>(new Map());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [expandedAddMemberSections, setExpandedAddMemberSections] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<GroupMember | null>(null);

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const email = await AsyncStorage.getItem('email');
            logDebug('Fetching groups with:', { email });

            if (!token || !email) {
                console.log('No token or email found');
                setGroupsData([]);
                return;
            }

            const groupsResponse = await fetch(`http://10.0.2.2:8080/groups?email=${email}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).catch(error => {
                logDebug('Initial fetch failed:', error);
                console.log(`Network request failed: ${error.message}`);
                return null;
            });

            if (!groupsResponse) {
                setGroupsData([]);
                return;
            }

            logDebug('Groups response status:', groupsResponse.status);
            const responseText = await groupsResponse.text();
            logDebug('Groups response body:', responseText);

            if (!groupsResponse.ok) {
                console.log(`Server responded with ${groupsResponse.status}`);
                setGroupsData([]);
                return;
            }

            const groupsData = JSON.parse(responseText);
            
            // Check if there are any groups before proceeding
            if (!groupsData || !Array.isArray(groupsData) || groupsData.length === 0) {
                console.log('No groups found or invalid groups data');
                setGroupsData([]);
                return;
            }

            const groupNames = groupsData.map((group: { groupName: string }) => group.groupName);
            logDebug('Group names to fetch details for:', groupNames);
            
            const firstGroupResponse = await fetch(`http://10.0.2.2:8080/groups/${groupsData[0].groupName}/details`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (firstGroupResponse.ok) {
                const firstGroupDetails = await firstGroupResponse.json();
                const userDetails = firstGroupDetails.members.find((m: GroupMember) => m.email === email);
                if (userDetails) {
                    setCurrentUser(userDetails);
                    setSelectedMembers(new Map([[userDetails.email, userDetails]]));
                }
            }

            const groupDetailsPromises = groupNames.map(async (groupName: string) => {
                logDebug(`Fetching details for group: ${groupName}`);
                try {
                    const detailsResponse = await fetch(`http://10.0.2.2:8080/groups/${groupName}/details`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const detailsText = await detailsResponse.text();
                    logDebug(`Details response for ${groupName}:`, detailsText);

                    if (!detailsResponse.ok) {
                        throw new Error(`Failed to fetch details for ${groupName}: ${detailsResponse.status}`);
                    }

                    const details: GroupDetailsResponse = JSON.parse(detailsText);
                    
                    // Create a new object with properly parsed members
                    const groupData = {
                        id: details.groupName,
                        name: details.groupName,
                        createdAt: details["Date of creation"],
                        members: details.members.map(member => ({
                            fullName: member.fullName,
                            email: member.email
                        }))
                    };

                    logDebug(`Processed group data for ${groupName}:`, JSON.stringify(groupData, null, 2));
                    return groupData;
                } catch (error) {
                    logDebug(`Error fetching details for ${groupName}:`, error);
                    return null;
                }
            });

            const groupDetails = await Promise.all(groupDetailsPromises);
            logDebug('All group details:', JSON.stringify(groupDetails, null, 2));

            const validGroups = groupDetails.filter((group): group is Group => group !== null);
            setGroupsData(validGroups);
            
            // Verify the data structure
            logDebug('Final groups data structure:', 
                JSON.stringify(validGroups.map(g => ({
                    id: g.id,
                    name: g.name,
                    membersCount: g.members.length,
                    sampleMember: g.members[0]
                })), null, 2)
            );
        } catch (error) {
            console.log('Error in fetchGroups:', error);
            setGroupsData([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    const createGroup = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const email = await AsyncStorage.getItem('email');
            const members = Array.from(selectedMembers.values()).map(m => m.email);
            
            if (!token || !email || !groupName || members.length < 1) {
                Alert.alert('Error', 'Please enter a group name and add at least one other member');
                return;
            }

            const response = await fetch('http://10.0.2.2:8080/groups/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: groupName,
                    members: members
                })
            });

            const responseText = await response.text();
            
            if (response.ok) {
                Alert.alert('Success', 'Group created successfully');
                setGroupName('');
                setSelectedMembers(new Map([[currentUser?.email || '', currentUser || { fullName: '', email: '' }]]));
                setActiveTab('groups');
                fetchGroups();
            } else {
                Alert.alert('Error', responseText || 'Failed to create group');
            }
        } catch (error) {
            console.log('Error creating group:', error);
            Alert.alert('Error', 'Failed to create group. Please try again.');
        }
    };

    const addMemberToGroup = async (member: SearchResultMember, groupName: string) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token || !groupName) return;

            const response = await fetch(`http://10.0.2.2:8080/groups/${groupName}/add-member`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: groupName,
                    email: member.email,
                    fullName: member.fullName
                })
            });

            const responseText = await response.text();
            
            if (response.ok) {
                Alert.alert('Success', `Added ${member.fullName} to the group`);
                setSearchQuery('');
                setSearchResults([]);
                setExpandedAddMemberSections(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(groupName);
                    return newSet;
                });
                await fetchGroups();
            } else {
                Alert.alert('Error', responseText);
            }
        } catch (error) {
            // Silently log error but don't show network error alert
            console.log('Error adding member:', error);
        }
    };

    const searchMembers = useCallback(async (query: string, existingMembers: string[] = []) => {
        try {
            logDebug('Searching members with query:', query);
            const token = await AsyncStorage.getItem('token');
            const email = await AsyncStorage.getItem('email');
            
            if (!token || !email || !query) return;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`http://10.0.2.2:8080/search/members`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sender: email, receiver: query }),
                signal: controller.signal
            }).catch(error => {
                logDebug('Search request failed:', error);
                throw new Error(`Network request failed: ${error.message}`);
            });

            clearTimeout(timeoutId);
            logDebug('Search response status:', response.status);
            
            const responseText = await response.text();
            logDebug('Search response body:', responseText);

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const results = JSON.parse(responseText);
            logDebug('Parsed search results:', results);
            
            const filteredResults = results
                .filter((result: SearchResultMember) => 
                    !existingMembers.includes(result.email) &&
                    result.email !== currentUser?.email
                );
            setSearchResults(filteredResults);
        } catch (error) {
            handleError(error, 'searching members', true);
            setSearchResults([]);
        }
    }, [currentUser]);
    // console.log(searchResults);

    const handleAddMember = (member: SearchResultMember) => {
        if (activeTab === 'createGroup') {
            setSelectedMembers(prev => {
                const newMap = new Map(prev);
                newMap.set(member.email, {
                    fullName: member.fullName,
                    email: member.email
                });
                return newMap;
            });
        }
    };

    const toggleGroupExpansion = (groupId: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    const toggleAddMemberSection = (groupId: string) => {
        setExpandedAddMemberSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    useEffect(() => {
        if (activeTab === 'groups') {
            fetchGroups();
        } else if (activeTab === 'createGroup' && searchQuery) {
            searchMembers(searchQuery);
        }
    }, [activeTab, searchQuery]);

    useEffect(() => {
        if (currentUser) {
            setSelectedMembers(new Map([[currentUser.email, currentUser]]));
        }
    }, [currentUser]);

    // Add new effect to set current user from stored details
    useEffect(() => {
        const initializeCurrentUser = async () => {
            try {
                const storedDetails = await AsyncStorage.getItem('currentUserDetails');
                if (storedDetails) {
                    const userDetails = JSON.parse(storedDetails);
                    setCurrentUser(userDetails);
                    setSelectedMembers(new Map([[userDetails.email, userDetails]]));
                }
            } catch (error) {
                console.log('Error initializing current user:', error);
            }
        };

        initializeCurrentUser();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchGroups();
        setRefreshing(false);
    }, [fetchGroups]);

    const renderAddMemberSection = (item: Group, isAddMemberExpanded: boolean) => (
        <>
            <Pressable 
                style={styles.addMemberHeader}
                onPress={(e) => {
                    e.stopPropagation();
                    toggleAddMemberSection(item.id);
                }}
            >
                <ThemedText style={styles.addMemberTitle}>Add More Members</ThemedText>
                <MaterialIcons 
                    name={isAddMemberExpanded ? "expand-less" : "expand-more"} 
                    size={24} 
                    color="#888" 
                />
            </Pressable>

            {isAddMemberExpanded && (
                <ThemedView style={styles.addMemberSection}>
                    <ThemedView style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Search users by email..."
                            placeholderTextColor="#666"
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                if (text.length > 0) {
                                    searchMembers(text, item.members.map(m => m.email));
                                } else {
                                    setSearchResults([]);
                                }
                            }}
                        />
                    </ThemedView>
                    {searchQuery.length > 0 && (
                        <FlatList
                            data={searchResults}
                            renderItem={({ item: member }) => (
                                <Pressable 
                                    style={styles.searchResultItem}
                                >
                                    <ThemedView style={styles.searchResultContent}>
                                        <ThemedView style={styles.memberInfo}>
                                            <ThemedText style={styles.memberName}>
                                                {member.fullName}
                                            </ThemedText>
                                            <ThemedText style={styles.memberEmail}>
                                                {member.email}
                                            </ThemedText>
                                        </ThemedView>
                                        <Pressable 
                                            style={styles.addButton}
                                            onPress={() => addMemberToGroup(member, item.name)}
                                        >
                                            <ThemedText style={styles.addButtonText}>Add</ThemedText>
                                        </Pressable>
                                    </ThemedView>
                                </Pressable>
                            )}
                            keyExtractor={(member) => `search-${member.email}`}
                            style={styles.searchResults}
                        />
                    )}
                </ThemedView>
            )}
        </>
    );


    const renderGroupItem = ({ item }: { item: Group }) => {
        const isExpanded = expandedGroups.has(item.id);
        const isAddMemberExpanded = expandedAddMemberSections.has(item.id);
        
        return (
            <Pressable 
                style={[styles.groupItem]} 
                onPress={() => toggleGroupExpansion(item.id)}
            >
                <ThemedView style={styles.groupHeader}>
                    <ThemedView style={styles.groupTitleContainer}>
                        <Image 
                            source={require('@/assets/images/group.png')} 
                            style={styles.groupIcon} 
                        />
                        <ThemedText style={styles.groupName}>{item.name}</ThemedText>
                    </ThemedView>
                    <MaterialIcons 
                        name={isExpanded ? "expand-less" : "expand-more"} 
                        size={24} 
                        color="#888" 
                    />
                </ThemedView>
                {isExpanded && (
                    <ThemedView style={styles.expandedContent}>
                        <ThemedText style={styles.groupDate}>
                            Created: {new Date(item.createdAt).toLocaleDateString()}
                        </ThemedText>
                        <ThemedText style={styles.membersHeader}>Group Members:</ThemedText>
                        {item.members.map((member, index) => (
                            <ThemedView key={index} style={styles.memberContainer}>
                                <ThemedText style={styles.memberBullet}>•</ThemedText>
                                <ThemedView style={styles.memberInfo}>
                                    <ThemedText style={styles.memberName}>
                                        {member.fullName}
                                    </ThemedText>
                                    <ThemedText style={styles.memberEmail}>
                                        {member.email}
                                    </ThemedText>
                                </ThemedView>
                            </ThemedView>
                        ))}
                        
                        {renderAddMemberSection(item, isAddMemberExpanded)}
                    </ThemedView>
                )}
            </Pressable>
        );
    };

    const renderSearchItem = ({ item }: { item: SearchResultMember }) => (
        <Pressable 
            style={styles.memberItem}
            onPress={() => handleAddMember(item)}
        >
            <ThemedView style={styles.searchResultContent}>
                <ThemedView style={styles.memberInfo}>
                    <ThemedText style={styles.memberName}>
                        {item.fullName}
                    </ThemedText>
                    <ThemedText style={styles.memberEmail}>
                        {item.email}
                    </ThemedText>
                </ThemedView>
                <Pressable 
                    style={styles.addButton}
                    onPress={() => handleAddMember(item)}
                >
                    <ThemedText style={styles.addButtonText}>Add</ThemedText>
                </Pressable>
            </ThemedView>
        </Pressable>
    );

    const renderSelectedMember = ({ item }: { item: string }) => (
        <ThemedText style={styles.memberEmail}>{item}</ThemedText>
    );

    // console.log(groupsData);

    const renderGroupsTab = () => (
        <>
            {isLoading && groupsData.length === 0 ? (
                <ThemedText style={styles.loadingText}>Loading groups...</ThemedText>
            ) : (
                <FlatList
                    data={groupsData}
                    renderItem={renderGroupItem}
                    keyExtractor={(item, index) => item.id ? item.id : `group-${index}-${item.name}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                    }
                    ListEmptyComponent={
                        <ThemedText style={styles.emptyText}>No groups found</ThemedText>
                    }
                />
            )}
        </>
    );

    const renderCreateGroupTab = () => (
        <ThemedView style={styles.createGroupContainer}>
            <ThemedView style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Group Name"
                    placeholderTextColor="#666"
                    value={groupName}
                    onChangeText={setGroupName}
                />
            </ThemedView>
            <ThemedView style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Search Users by email address..."
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </ThemedView>
            <FlatList
                data={searchResults}
                renderItem={renderSearchItem}
                keyExtractor={(item: SearchResultMember) => `search-${item.email}`}
                contentContainerStyle={styles.listContent}
            />
            <ThemedText style={styles.selectedMembersTitle}>
                Members ({selectedMembers.size}/2):
            </ThemedText>
            {currentUser && (
                <ThemedView style={styles.currentUserContainer}>
                    <ThemedText style={styles.memberName}>{currentUser.fullName} (You)</ThemedText>
                    <ThemedText style={styles.memberEmail}>{currentUser.email}</ThemedText>
                </ThemedView>
            )}
            <FlatList
                data={Array.from(selectedMembers.values()).filter(m => m.email !== currentUser?.email)}
                renderItem={({ item }) => (
                    <ThemedView style={styles.selectedMemberItem}>
                        <ThemedView style={styles.memberInfo}>
                            <ThemedText style={styles.memberName}>{item.fullName}</ThemedText>
                            <ThemedText style={styles.memberEmail}>{item.email}</ThemedText>
                        </ThemedView>
                        <Pressable 
                            onPress={() => {
                                setSelectedMembers(prev => {
                                    const newMap = new Map(prev);
                                    newMap.delete(item.email);
                                    return newMap;
                                });
                            }}
                            style={styles.removeMemberButton}
                        >
                            <MaterialIcons name="close" size={20} color="#888" />
                        </Pressable>
                    </ThemedView>
                )}
                keyExtractor={item => `selected-member-${item.email}`}
                contentContainerStyle={styles.listContent}
            />
            <Pressable 
                style={[
                    styles.createButton,
                    selectedMembers.size < 2 && styles.createButtonDisabled
                ]} 
                onPress={createGroup}
                disabled={selectedMembers.size < 2}
            >
                <ThemedText style={styles.createButtonText}>
                    Create Group ({selectedMembers.size}/2 members)
                </ThemedText>
            </Pressable>
        </ThemedView>
    );

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.tabContainer}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={setActiveTab}
                    buttons={[
                        { 
                            value: 'groups', 
                            label: 'Groups', 
                            labelStyle: styles.segmentButtonLabel,
                            style: activeTab === 'groups' ? styles.selectedSegmentButton : null
                        },
                        { 
                            value: 'createGroup', 
                            label: 'Create Group', 
                            labelStyle: styles.segmentButtonLabel,
                            style: activeTab === 'createGroup' ? styles.selectedSegmentButton : null
                        },
                    ]}
                    style={styles.segmentedControl}
                />
            </ThemedView>
            {activeTab === 'groups' ? renderGroupsTab() : renderCreateGroupTab()}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: '#151718',
        paddingTop: 20,
    },
    groupName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputWrapper: {
        marginVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
        overflow: 'hidden',
    },
    input: {
        height: 40,
        paddingHorizontal: 15,
        color: '#666',  // Add this line to set the text color
    },
    listContent: {
        paddingBottom: 20,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 4,
    },
    groupItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    expandedContent: {
        marginTop: 8,
        paddingLeft: 4,
    },
    groupDate: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8,
        marginLeft: 4,
    },
    membersHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
        marginLeft: 4,
    },
    memberContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
        marginLeft: 8,
    },
    memberBullet: {
        fontSize: 14,
        color: '#888',
        marginRight: 8,
        marginTop: 2,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    memberEmail: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#666',
        marginTop: 1,
    },
    createGroupContainer: {
        padding: 20,
    },
    createButton: {
        // backgroundColor: '#5865F2',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
    },
    createButtonText: {
        // color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    memberItem: {
        padding: 10,
        borderBottomWidth: 1,
        // borderBottomColor: '#333',
    },
    selectedMembersTitle: {
        fontSize: 16,
        // color: '#fff',
        fontWeight: 'bold',
        margin: 10,
    },
    segmentedControl: {
        backgroundColor: 'transparent',
    },
    segmentButtonLabel: {
        color: '#5c9eff',  // Light blue color
    },
    selectedSegmentButton: {
        backgroundColor: '#4a4a4a',  // Very light grey color for selected state
    },
    selectedMemberItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingRight: 16, // Reduced right padding
    },
    removeMemberButton: {
        padding: 5,
    },
    removeMemberText: {
        // color: '#ff4444',
        fontSize: 20,
        fontWeight: 'bold',
    },
    createButtonDisabled: {
        // backgroundColor: '#666',
    },
    addMemberSection: {
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    searchResults: {
        maxHeight: 200,
    },
    searchResultItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    searchResultContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    searchResultText: {
        fontSize: 14,
        color: '#fff',
        flex: 1,
    },
    searchResultRemoveButton: {
        padding: 4,
        marginLeft: 8,
    },
    groupSelectorContainer: {
        padding: 10,
    },
    selectorLabel: {
        fontSize: 16,
        // color: '#fff',
        marginBottom: 10,
    },
    groupSelectorList: {
        paddingVertical: 5,
    },
    groupSelector: {
        // backgroundColor: '#333',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    groupSelectorSelected: {
        // backgroundColor: '#5865F2',
    },
    groupSelectorText: {
        // color: '#fff',
        fontSize: 14,
    },
    selectGroupPrompt: {
        // color: '#ccc',
        textAlign: 'center',
        marginTop: 20,
    },
    addMemberHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    addMemberTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        // color: '#fff',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
    },
    cancelButton: {
        padding: 8,
        marginLeft: 8,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#888',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#666',
    },
    currentUserContainer: {
        padding: 10,
        backgroundColor: '#33333322',  // Semi-transparent gray that works in both modes
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#33333333',  // Very light border
    },
    addButton: {
        backgroundColor: '#444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginLeft: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    groupTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    groupIcon: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    tabContainer: {
        marginVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
});
