package edu.sabanciuniv.howudoin.controller;

import edu.sabanciuniv.howudoin.model.Group;
import edu.sabanciuniv.howudoin.model.Message;
import edu.sabanciuniv.howudoin.model.User;
import edu.sabanciuniv.howudoin.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class MessageController {

    @Autowired
    private MessageService messageService;

    //POST /messages/send: Send a message to a friend
        @PostMapping("/messages/send")
    public ResponseEntity<String> sendPersonalMessage(@RequestBody Message message) ///contains sender, receiver emails, content
    {
        if (message.getSender() == null)
        {
            return new ResponseEntity<>("A message should be sent by someone", HttpStatus.BAD_REQUEST);
        }
        if(message.getReceiver() == null)
        {
            return new ResponseEntity<>("A message should be sent to someone", HttpStatus.BAD_REQUEST);
        }
        if(message.getReceiver().equals(message.getSender()))
        {
            return new ResponseEntity<>("Sender and Receiver cannot be the same", HttpStatus.BAD_REQUEST);
        }
        if(message.getContent().isEmpty())          ///as it is alr initialized in model
        {
            return new ResponseEntity<>("A message should not be empty", HttpStatus.BAD_REQUEST);
        }

        User sender = messageService.findUserByEmail(message.getSender());
        User receiver = messageService.findUserByEmail(message.getReceiver());

        //if either doesnt exist
        if (sender == null)
        {
            return new ResponseEntity<>("Sender not found", HttpStatus.NOT_FOUND);
        }
        if (receiver == null)
        {
            return new ResponseEntity<>("Receiver not found", HttpStatus.NOT_FOUND);
        }

        ///if they are not friends, should not send
        if(!sender.getFriends().contains(receiver.getEmail()))
        {
            return new ResponseEntity<>("Users are not friends", HttpStatus.BAD_REQUEST);
        }

        ///could prolly do polymorphism but no time (4 projects babba)
        messageService.sendPersonalMessage(message);
        return new ResponseEntity<>("Message sent", HttpStatus.CREATED);
    }

    //GET /messages: Retrieve conversation history
    @GetMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> getPersonalMessages(@RequestParam("sender") String senderEmail, @RequestParam("receiver") String receiverEmail)  ///contains sender and receiver email
    {
        if (senderEmail == null || receiverEmail == null || receiverEmail.equals(senderEmail))
        {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        User sender = messageService.findUserByEmail(senderEmail);
        User receiver = messageService.findUserByEmail(receiverEmail);

        ///if either doesn't exist or if not friends, cannot send
        if (sender == null || receiver == null || !sender.getFriends().contains(receiver.getEmail()))
        {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        List<Map<String, Object>> messages = messageService.getPersonalMessages(senderEmail, receiverEmail);
        return new ResponseEntity<>(messages, HttpStatus.OK);
    }

    //POST /groups/{groupId}/send: Sends a message to all members of the specified group
    @PostMapping("/groups/{groupId}/send")
    public ResponseEntity<String> sendGroupMessage(@PathVariable("groupId") String groupName, @RequestBody Message msg) ///contains sender email and content
    {
        if (msg.getSender() == null)
        {
            return new ResponseEntity<>("A message should be sent by someone", HttpStatus.BAD_REQUEST);
        }
        if(msg.getContent().isEmpty())                      ///as it is alr initialized in model
        {
            return new ResponseEntity<>("A message should not be empty", HttpStatus.BAD_REQUEST);
        }

        Group group = messageService.findGroupByName(groupName);
        User sender = messageService.findUserByEmail(msg.getSender());

        //if group does not exist
        if (group == null) {
            return new ResponseEntity<>("Group not found", HttpStatus.NOT_FOUND);
        }
        //if sender does not exist
        if (sender == null)
        {
            return new ResponseEntity<>("Sender not found", HttpStatus.NOT_FOUND);
        }
        if (!group.getMembers().contains(sender.getEmail()))
        {
            return new ResponseEntity<>("User is not a member", HttpStatus.BAD_REQUEST);
        }

        messageService.sendGroupMessage(groupName,msg);     ///now that we verified emails/names, we can send it if we want

        return new ResponseEntity<>("Message sent successfully", HttpStatus.CREATED);
    }

    //GET /groups/{groupId}/messages: Retrieves the message history for the specified group
    @GetMapping("/groups/{groupId}/messages")
    public ResponseEntity<List<Map<String, Object>>> getGroupMessages(@PathVariable("groupId") String groupName)
    {

        Group group = messageService.findGroupByName(groupName);

        if (group == null)
        {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        List<Map<String, Object>> messages = messageService.getGroupMessages(groupName);
        return new ResponseEntity<>(messages, HttpStatus.OK);
    }

}
