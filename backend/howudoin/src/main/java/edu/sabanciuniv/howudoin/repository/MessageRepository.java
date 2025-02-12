package edu.sabanciuniv.howudoin.repository;

import edu.sabanciuniv.howudoin.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findBySenderAndReceiver(String senderEmail, String receiverEmail);
    List<Message> findByReceiver(String receiverEmail);
}
