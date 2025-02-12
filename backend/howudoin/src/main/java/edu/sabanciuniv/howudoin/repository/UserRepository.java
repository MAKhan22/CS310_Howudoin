package edu.sabanciuniv.howudoin.repository;

import edu.sabanciuniv.howudoin.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);                 ///extra querying method for repository
    List<User> findByEmailContaining(String email);
}
