package edu.sabanciuniv.howudoin.service;

import edu.sabanciuniv.howudoin.model.Group;
import edu.sabanciuniv.howudoin.model.User;
import edu.sabanciuniv.howudoin.repository.GroupRepository;
import edu.sabanciuniv.howudoin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private GroupRepository groupRepository;

    public Group findGroupByName(String groupName) {return groupRepository.findByName(groupName).orElse(null);}

    @Autowired
    AuthenticationManager authenManager;

    @Autowired
    private JWTService jwtService;

    public boolean register(User user)
    {
        //if email already exists
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return false;
        }

        //else
        userRepository.save(user);
        return true;
    }

//    public void login(User user)
//    {
//        ///do the authorization magik
//    }

    ///Helper Function
    public User findUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

//    private Group findGroupByName(String groupName) {
//        return GroupRepository
//    }

    public List<Map<String, Object>> getFriends(User user)
    {
        ///Not doing {return friends} approach (having List<Map<String, Object>> as a stored private object) as it might store too much data in cache
        ///Instead, we do Dynamic fetching for frequently changing data (during run time)
        List<Map<String,Object>> friends = new ArrayList<>();

        ///no need to check if user exists as we already did it in controller
        ///no need to check if friend exists as we already do that in adding friends
        for (String friendEmail : user.getFriends())
        {
            User friend = findUserByEmail(friendEmail);
            Map<String, Object> friendDetails = new HashMap<>();

            friendDetails.put("fullName", friend.getFirstName() + " " + friend.getLastName());
            friendDetails.put("email", friend.getEmail());
            friends.add(friendDetails);
        }

        return friends;
    }

//    public List<Map<String, Object>> searchUsersByEmail(String email) {
//        List<Map<String, Object>> users = new ArrayList<>();
//        List<User> foundUsers = userRepository.findByEmailContaining(email);
//
//        for (User user : foundUsers) {
//            Map<String, Object> userDetails = new HashMap<>();
//            userDetails.put("fullName", user.getFirstName() + " " + user.getLastName());
//            userDetails.put("email", user.getEmail());
//            users.add(userDetails);
//        }
//
//        return users;
//    }

    public List<Map<String, Object>> searchUsersByEmail(User sender, String receiverEmail) {
        List<Map<String, Object>> users = new ArrayList<>();
        List<User> foundUsers = userRepository.findByEmailContaining(receiverEmail);

        List<String> friendEmails = sender.getFriends();
        List<String> friendRequestEmails = sender.getFriendRequests();

        for (User user : foundUsers) {
            if (!friendEmails.contains(user.getEmail()) && !user.getEmail().equals(sender.getEmail()) && !friendRequestEmails.contains(user.getEmail())) {
                Map<String, Object> userDetails = new HashMap<>();
                userDetails.put("fullName", user.getFirstName() + " " + user.getLastName());
                userDetails.put("email", user.getEmail());
                users.add(userDetails);
            }
        }

        return users;
    }

    public List<Map<String, Object>> searchMembersByEmail(User sender, String receiverEmail) {
        List<Map<String, Object>> users = new ArrayList<>();
        List<User> foundUsers = userRepository.findByEmailContaining(receiverEmail);

        List<String> friendEmails = sender.getFriends();
//        List<String> friendRequestEmails = sender.getFriendRequests();

        for (User user : foundUsers) {
            if (friendEmails.contains(user.getEmail()) && !user.getEmail().equals(sender.getEmail())) {
                Map<String, Object> userDetails = new HashMap<>();
                userDetails.put("fullName", user.getFirstName() + " " + user.getLastName());
                userDetails.put("email", user.getEmail());
                users.add(userDetails);
            }
        }

        return users;
    }

    public List<Map<String, Object>> getFriendRequests(User user) {
        List<Map<String, Object>> friendRequests = new ArrayList<>();

        for (String requesterEmail : user.getFriendRequests()) {
            User requester = findUserByEmail(requesterEmail);
            Map<String, Object> requesterDetails = new HashMap<>();

            requesterDetails.put("fullName", requester.getFirstName() + " " + requester.getLastName());
            requesterDetails.put("email", requester.getEmail());
            friendRequests.add(requesterDetails);
        }

        return friendRequests;
    }

    public String verifytoken(User user){
        Authentication auth = authenManager.authenticate(new UsernamePasswordAuthenticationToken(user.getEmail(), user.getPassword()));

        if(auth.isAuthenticated()){
            return jwtService.generateToken(user.getEmail());
        }

        else return null;
    }

    public void sendFriendRequest(User sender, User receiver)
    {
        //already checked that both exist and receiver is neither already his friend nor already applied to be sender's friend
        receiver.getFriendRequests().add(sender.getEmail());  // Add friend request to the recipient
        userRepository.save(receiver);
    }

    public void acceptFriendRequest(User sender, User receiver)
    {
        //already checked that both exist and that there is a friend request to be accepted
        receiver.getFriendRequests().remove(sender.getEmail());  // Remove from friend requests
        receiver.getFriends().add(sender.getEmail());            // Add to friends list
        sender.getFriends().add(receiver.getEmail());            // Add user to friend’s friend list

        userRepository.save(receiver);
        userRepository.save(sender);
    }

    public List<Map<String, Object>> getGroups(User user) {
        List<Map<String, Object>> groups = new ArrayList<>();

        for (String groupName : user.getGroups()) {
            Group group = findGroupByName(groupName);
            if (group != null) {
                Map<String, Object> groupDetails = new HashMap<>();
                groupDetails.put("groupName", group.getName());
                groups.add(groupDetails);
            }
        }

        return groups;
    }

    public void addGroupToUsers(List<String> memberEmails, String groupName)
    {
        for (String email : memberEmails) {
            User user = findUserByEmail(email);
            if (user != null) {
                user.getGroups().add(groupName);
                // Save user back to the database
                userRepository.save(user);
            }
        }
    }

//    public List<User> getAllUsers()
//    {
//        return userRepository.findAll();
//    }

//    public void updateUser(User user)
//    {
//        userRepository.save(user);
//    }

//    public void deleteUser(int id)
//    {
//        userRepository.deleteById(id);
//    }

}
