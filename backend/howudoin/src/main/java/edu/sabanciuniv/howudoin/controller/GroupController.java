package edu.sabanciuniv.howudoin.controller;

import edu.sabanciuniv.howudoin.model.Group;
import edu.sabanciuniv.howudoin.model.User;
import edu.sabanciuniv.howudoin.service.GroupService;
import edu.sabanciuniv.howudoin.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class GroupController {

    @Autowired
    private GroupService groupService;
    @Autowired
    private UserService userService;

    //POST /groups/create: Creates a new group with a given name and members
    @PostMapping("/groups/create")
    public ResponseEntity<String> createGroup(@RequestBody Group group)   ///contains name, members
    {
        //if name or members are not specified
        if (group.getMembers().size() <= 1)  ///use isEmpty or size() coz if null then it becomes initialized anyways from model
        {
            return new ResponseEntity<>("A group should have atleast two members", HttpStatus.BAD_REQUEST);
        }
        if (group.getName() == null)
        {
            return new ResponseEntity<>("A group should have a name", HttpStatus.BAD_REQUEST);
        }

        // Check if all members are friends
        List<String> members = group.getMembers();
        for (int i = 0; i < members.size(); i++) {
            for (int j = i + 1; j < members.size(); j++) {
                String memberEmail1 = members.get(i);
                String memberEmail2 = members.get(j);
                User user1 = userService.findUserByEmail(memberEmail1);
                if (user1 == null || !user1.getFriends().contains(memberEmail2)) {
                    return new ResponseEntity<>("All members must be friends with each other to create a group", HttpStatus.BAD_REQUEST);
                }
            }
        }

        ///check if group name already exists
        if (!groupService.create(group))
        {
            return new ResponseEntity<>("Group name already in use", HttpStatus.CONFLICT);
        }

        userService.addGroupToUsers(group.getMembers(), group.getName());

        return new ResponseEntity<>("Group created successfully", HttpStatus.CREATED);
    }

    //POST /groups/{groupId}/add-member: Adds a new member to an existing group
    @PostMapping("/groups/{groupId}/add-member")
    public ResponseEntity<String> addGroupMember(@PathVariable("groupId") String groupName, @RequestBody User user)  // Contains user email
    {
        // Check if user email is provided
        if (user.getEmail() == null) {
            return new ResponseEntity<>("Email field is empty", HttpStatus.BAD_REQUEST);
        }

        // Find the group by its name and the user by their email
        Group group = groupService.findGroupByName(groupName);
        User validMember = groupService.findUserByEmail(user.getEmail());

        // Validate existence of the group and the user
        if (group == null) {
            return new ResponseEntity<>("Group not found", HttpStatus.NOT_FOUND);
        }
        if (validMember == null) {
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }

        // Check if the user is already a member of the group
        if (group.getMembers().contains(user.getEmail())) {
            return new ResponseEntity<>("User is already a member of this group", HttpStatus.CONFLICT);
        }

        // Check if new member is friends with everyone
        List<String> members = group.getMembers();
        for (int i = 0; i < members.size(); i++) {
            String memberEmail = members.get(i);
            String newMemberEmail = user.getEmail();
            User user1 = userService.findUserByEmail(memberEmail);
            if (user1 == null || !user1.getFriends().contains(newMemberEmail)) {
                return new ResponseEntity<>("New member is not friends with all other members", HttpStatus.BAD_REQUEST);
            }
        }

        // Add the user to the group
        groupService.addGroupMember(group, validMember);
        userService.addGroupToUsers(List.of(user.getEmail()), groupName);
        return new ResponseEntity<>("Member added successfully", HttpStatus.CREATED);
    }


    //GET /groups/{groupId}/members: Retrieves the list of members for the specified group
    @GetMapping("/groups/{groupId}/members")
    public ResponseEntity<List<Map<String, Object>>> getGroupMembers(@PathVariable("groupId") String groupName)
    {
        Group group = groupService.findGroupByName(groupName);

        if (group == null)
        {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        List<Map<String, Object>> members = groupService.getGroupMembers(group);
        return new ResponseEntity<>(members, HttpStatus.OK);
    }

    @GetMapping("/groups/{groupId}/details")
    public ResponseEntity<Map<String, Object>> getGroupDetails(@PathVariable("groupId") String groupName) {
        Group group = groupService.findGroupByName(groupName);

        if (group == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        Map<String, Object> groupDetails = new HashMap<>();
        groupDetails.put("groupName", group.getName());
        groupDetails.put("Date of creation", group.getCreationDate());
        groupDetails.put("members", groupService.getGroupMembers(group));   //open to removal

        return new ResponseEntity<>(groupDetails, HttpStatus.OK);
    }


}
