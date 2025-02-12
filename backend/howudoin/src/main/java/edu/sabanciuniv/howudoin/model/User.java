package edu.sabanciuniv.howudoin.model;

import lombok.*;
import org.springframework.boot.autoconfigure.security.oauth2.resource.OAuth2ResourceServerProperties;
import org.springframework.data.annotation.Id;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class User {

//    @Id
//    private String id;                                 ///String to ensure auto_generation of ids

    @Id
    private String email;                              ///should be unique(for user creation purposes)

    private String firstName;
    private String lastName;

    private String password;
//    private OAuth2ResourceServerProperties.Jwt token;

    private List<String> friends = new ArrayList<>();              ///emails of friends
    private List<String> friendRequests = new ArrayList<>();       ///emails of senders
    private List<String> groups = new ArrayList<>();               ///group names
}
