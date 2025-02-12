package edu.sabanciuniv.howudoin.service;

import edu.sabanciuniv.howudoin.model.Group;
import edu.sabanciuniv.howudoin.model.User;
import edu.sabanciuniv.howudoin.repository.GroupRepository;
import edu.sabanciuniv.howudoin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GroupService {

    @Autowired
    private GroupRepository groupRepository;
    @Autowired
    private UserRepository userRepository;

    ///for fetching user data

    public boolean create(Group group)
    {
        ///if name already exists
        if (groupRepository.findByName(group.getName()).isPresent())
        {
            return false;
        }

        groupRepository.save(group);
        return true;
    }

    ///Helper Function
    public Group findGroupByName(String groupName)
    {
        return groupRepository.findByName(groupName).orElse(null);
    }

    ///Helper Function
    public User findUserByEmail(String userEmail)
    {
        return userRepository.findByEmail(userEmail).orElse(null);
    }

    public void addGroupMember(Group group, User user)
    {
        //already checked that both exist and user not alr a member
        group.getMembers().add(user.getEmail());  // Add friend request to the recipient
        groupRepository.save(group);
    }

    public List<Map<String, Object>> getGroupMembers(Group group)
    {
        ///Dynamic fetching approach for more efficient memory usage (instead of storing all member details)
        //get members of that group
        List<Map<String, Object>> groupMembers = new ArrayList<>();

        for (String memberEmail : group.getMembers())
        {
            User member = findUserByEmail(memberEmail);
            Map<String, Object> friendDetails = new HashMap<>();

            friendDetails.put("fullName", member.getFirstName() + " " + member.getLastName());
            friendDetails.put("email", member.getEmail());
            groupMembers.add(friendDetails);
        }
        return groupMembers;
    }


}
