package edu.sabanciuniv.howudoin.repository;

import edu.sabanciuniv.howudoin.model.Group;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface GroupRepository extends MongoRepository<Group, String> {
    Optional<Group> findByName(String name);                 ///extra querying method for repository
}
