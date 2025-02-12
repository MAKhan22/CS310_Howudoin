package edu.sabanciuniv.howudoin.service;

import edu.sabanciuniv.howudoin.model.Group;
import edu.sabanciuniv.howudoin.model.Message;
import edu.sabanciuniv.howudoin.model.User;
import edu.sabanciuniv.howudoin.repository.GroupRepository;
import edu.sabanciuniv.howudoin.repository.MessageRepository;
import edu.sabanciuniv.howudoin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private GroupRepository groupRepository;

    ///Helper Function
    public User findUserByEmail(String userEmail)
    {
        return userRepository.findByEmail(userEmail).orElse(null);
    }

    ///Helper Function
    public Group findGroupByName(String groupName)
    {
        return groupRepository.findByName(groupName).orElse(null);
    }

    public void sendPersonalMessage(Message msg)
    {
        //alr checked users exist
        ///Now, this message should contain a sender email, a receiver email (or groupName), content and a sendDate (time of creation)

        messageRepository.save(msg);
    }

    public List<Map<String, Object>> getPersonalMessages(String senderEmail, String receiverEmail)
    {
        ///Dynamic fetching approach for more efficient memory usage (instead of storing all messages)
        //get messages of that chat
        ///could just return this object directly but for the sake of asthetics, we are filtering out the receiverID column
        List<Message> messages = messageRepository.findBySenderAndReceiver(senderEmail, receiverEmail);

        List<Map<String, Object>> personalMessages = new ArrayList<>();
        for (Message message : messages) {
            Map<String, Object> messageDetails = new HashMap<>();

            messageDetails.put("sender", message.getSender());
            messageDetails.put("content", message.getContent());
            messageDetails.put("sendDate", message.getSendDate());
            personalMessages.add(messageDetails);
        }

        return personalMessages;

    }

    public void sendGroupMessage(String groupName, Message message)
    {
        //alr checked group exists
        message.setReceiver(groupName);
        ///Now, this message should contain a senderEmail, a receiverEmail(or groupName), content and a sendDate (time of creation)

        messageRepository.save(message);
    }

    public List<Map<String, Object>> getGroupMessages(String groupName)
    {
        ///Dynamic fetching approach for more efficient memory usage (instead of storing all messages)
        //get messages of that group
        ///could just return this object directly but for the sake of asthetics, we are filtering out the receiverID column
        List<Message> messages = messageRepository.findByReceiver(groupName);

        List<Map<String, Object>> groupMessages = new ArrayList<>();
        for (Message message : messages) {
            Map<String, Object> messageDetails = new HashMap<>();

            messageDetails.put("sender", message.getSender());
            messageDetails.put("content", message.getContent());
            messageDetails.put("sendDate", message.getSendDate());
            groupMessages.add(messageDetails);
        }

        return groupMessages;
    }

}
