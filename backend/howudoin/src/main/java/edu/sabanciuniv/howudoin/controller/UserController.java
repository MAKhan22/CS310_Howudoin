package edu.sabanciuniv.howudoin.controller;

import edu.sabanciuniv.howudoin.model.User;
import edu.sabanciuniv.howudoin.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class UserController {

    @Autowired
    private UserService userService;

    ///API Endpoints:

    //POST /register: Register a new user (with name, last name, email, password)
    @PostMapping("/register")
    public ResponseEntity<String> createUser(@RequestBody User user)        ///contains both name, email and pwd
    {                                                                       ///apparently if non-existent fields are given, then spring ignores them
        //if any field is empty

        if (user.getFirstName() == null)
        {
            return new ResponseEntity<>("A user should have a first name", HttpStatus.BAD_REQUEST);
        }
        if (user.getLastName() == null)
        {
            return new ResponseEntity<>("A user should have a last name", HttpStatus.BAD_REQUEST);
        }
        if (user.getEmail() == null)
        {
            return new ResponseEntity<>("A user should have an email", HttpStatus.BAD_REQUEST);
        }
        if (user.getPassword() == null)
        {
            return new ResponseEntity<>("A user should have a password", HttpStatus.BAD_REQUEST);
        }

        //if the email is not in valid format (basic pattern check: something@example.com)
        if (!user.getEmail().matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            return new ResponseEntity<>("Email has invalid format", HttpStatus.BAD_REQUEST);
        }

        //OPTIONAL
        ///if password is not strong enough:
        ///At least 8 characters in length.
        /// Contains at least one uppercase letter (A-Z).
        /// Contains at least one lowercase letter (a-z).
        /// Contains at least one digit (0-9).
        /// Contains at least one special character (e.g., @#$%!&*?).
        if (!user.getPassword().matches("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@#$%!&*?])[A-Za-z\\d@#$%!&*?]{8,}$"))
        {
            return new ResponseEntity<>("Password is not strong enough", HttpStatus.BAD_REQUEST);
        }

        // Validate user (check if email already exists)
        if (!userService.register(user))        ///if email conflict
        {
            return new ResponseEntity<>("Email already in use", HttpStatus.CONFLICT);   //Use 409 status code
        }

        return new ResponseEntity<>("User registered successfully", HttpStatus.CREATED);  // Use 201 status code
    }

    //POST /login: Authenticate and login a user (with email and password)
    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody User user)
    {
        //if any field is empty
        if (user.getEmail() == null)
        {
            return new ResponseEntity<>("Email is missing", HttpStatus.BAD_REQUEST);
        }
        if (user.getPassword() == null)
        {
            return new ResponseEntity<>("Password is missing", HttpStatus.BAD_REQUEST);
        }

        //if the email is not in valid format (basic pattern check:
        String verificationToken = userService.verifytoken(user);

        if (verificationToken == null)
        {
            return new ResponseEntity<>("Invalid credentials", HttpStatus.UNAUTHORIZED);
        } else {
            return new ResponseEntity<>(verificationToken, HttpStatus.OK);
        }
    }

    ///we cant use @RequestBody stuff with @Get
    //GET /friends: Retrieve friend list (fullName and email)
    @GetMapping("/friends")
    public ResponseEntity<List<Map<String, Object>>> getFriends(@RequestParam("email") String userEmail) {  // contains email
//        String userEmail = (String) request.get("email");

        // If email field is empty
        if (userEmail == null || userEmail.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        User validUser = userService.findUserByEmail(userEmail);

        // If user does not exist
        if (validUser == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        List<Map<String, Object>> friends = userService.getFriends(validUser);

        return new ResponseEntity<>(friends, HttpStatus.OK);
    }

    @PostMapping("/search/users")
    public ResponseEntity<List<Map<String, Object>>> searchUsers(@RequestBody Map<String, String> emails) {
//        if (email == null || email.isEmpty()) {
//            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
//        }
        String senderEmail = emails.get("sender");
        String receiverEmail = emails.get("receiver");

        if (senderEmail == null) {
            return new ResponseEntity<>( HttpStatus.BAD_REQUEST);
        }

        User sender = userService.findUserByEmail(senderEmail);
//        User receiver = userService.findUserByEmail(receiverEmail);

        // if sender or receiver does not exist
        if (sender == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        List<Map<String, Object>> users = userService.searchUsersByEmail(sender, receiverEmail);

//        if (users.isEmpty()) {
//            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
//        }

        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @PostMapping("/search/members")
    public ResponseEntity<List<Map<String, Object>>> searchMembers(@RequestBody Map<String, String> emails) {
//        if (email == null || email.isEmpty()) {
//            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
//        }
        String senderEmail = emails.get("sender");
        String receiverEmail = emails.get("receiver");

        if (senderEmail == null) {
            return new ResponseEntity<>( HttpStatus.BAD_REQUEST);
        }

        User sender = userService.findUserByEmail(senderEmail);
//        User receiver = userService.findUserByEmail(receiverEmail);

        // if sender or receiver does not exist
        if (sender == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        List<Map<String, Object>> users = userService.searchMembersByEmail(sender, receiverEmail);

//        if (users.isEmpty()) {
//            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
//        }

        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @GetMapping("/friend/requests")
    public ResponseEntity<List<Map<String, Object>>> getFriendRequests(@RequestParam("email") String userEmail) {
        if (userEmail == null || userEmail.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        User validUser = userService.findUserByEmail(userEmail);

        if (validUser == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        List<Map<String, Object>> friendRequests = userService.getFriendRequests(validUser);

        return new ResponseEntity<>(friendRequests, HttpStatus.OK);
    }

    //POST /friends/add: Send a friend request
    @PostMapping("/friends/add")
    public ResponseEntity<String> sendFriendRequest(@RequestBody Map<String, String> emails) { // contains senderEmail and receiverEmail
        String senderEmail = emails.get("sender");
        String receiverEmail = emails.get("receiver");

        if (senderEmail == null) {
            return new ResponseEntity<>("Sender email is missing", HttpStatus.BAD_REQUEST);
        }
        if (receiverEmail == null) {
            return new ResponseEntity<>("Receiver email is missing", HttpStatus.BAD_REQUEST);
        }
        if (senderEmail.equals(receiverEmail)) {
            return new ResponseEntity<>("Sender email and receiver email cannot be the same", HttpStatus.BAD_REQUEST);
        }

        User sender = userService.findUserByEmail(senderEmail);
        User receiver = userService.findUserByEmail(receiverEmail);

        // If sender or receiver does not exist
        if (sender == null) {
            return new ResponseEntity<>("Sender not found", HttpStatus.NOT_FOUND);
        }
        if (receiver == null) {
            return new ResponseEntity<>("Receiver not found", HttpStatus.NOT_FOUND);
        }

        // Check if sender is already a friend or has already requested to be a friend
        if (receiver.getFriends().contains(sender.getEmail())) {
            return new ResponseEntity<>("Receiver is already a friend of sender", HttpStatus.BAD_REQUEST);
        }
        if (receiver.getFriendRequests().contains(sender.getEmail())) {
            return new ResponseEntity<>("Receiver has already requested to be a friend of sender", HttpStatus.BAD_REQUEST);
        }

        // Send the friend request using the service
        userService.sendFriendRequest(sender, receiver);

        return new ResponseEntity<>("Friend request sent successfully", HttpStatus.CREATED);
    }



    //POST /friends/accept: Accept a friend request (if there is a pending friend request)
    @PostMapping("/friends/accept")
    public ResponseEntity<String> acceptFriendRequest(@RequestBody Map<String, String> emails) { // contains senderEmail and receiverEmail
        String senderEmail = emails.get("sender");
        String receiverEmail = emails.get("receiver");

        if (senderEmail == null) {
            return new ResponseEntity<>("Sender email is missing", HttpStatus.BAD_REQUEST);
        }
        if (receiverEmail == null) {
            return new ResponseEntity<>("Receiver email is missing", HttpStatus.BAD_REQUEST);
        }
        if (senderEmail.equals(receiverEmail)) {
            return new ResponseEntity<>("Sender email and receiver email cannot be the same", HttpStatus.BAD_REQUEST);
        }

        User sender = userService.findUserByEmail(senderEmail);
        User receiver = userService.findUserByEmail(receiverEmail);

        // if sender or receiver does not exist
        if (sender == null) {
            return new ResponseEntity<>("Sender not found", HttpStatus.NOT_FOUND);
        }
        if (receiver == null) {
            return new ResponseEntity<>("Receiver not found", HttpStatus.NOT_FOUND);
        }

        // Check if there is a pending friend request from sender
        if (!receiver.getFriendRequests().contains(sender.getEmail())) {
            return new ResponseEntity<>("Receiver has no friend request from sender", HttpStatus.BAD_REQUEST);
        }

        // Accept the friend request using the service
        userService.acceptFriendRequest(sender, receiver);

        return new ResponseEntity<>("Friend request accepted", HttpStatus.OK);
    }

    @GetMapping("/groups")
    public ResponseEntity<List<Map<String, Object>>> getGroups(@RequestParam("email") String userEmail) {
        if (userEmail == null || userEmail.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        User validUser = userService.findUserByEmail(userEmail);

        if (validUser == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        List<Map<String, Object>> groups = userService.getGroups(validUser);

        return new ResponseEntity<>(groups, HttpStatus.OK);
    }




    //    @GetMapping("/")
//    public ResponseEntity<String> home()
//    {
//        return new ResponseEntity<>("Home page", HttpStatus.OK);
//    }

//    //POST /login: Authenticate and login a user (with email and password)
//    @PostMapping("/login")
//    public boolean userLogin(@RequestBody User user)
//    {
//        userService.login(user)
//    }

    //    //GET /friends: Retrieve friend list (id, fullname and email)
//    @GetMapping("/friends")
//    public ResponseEntity<List<Map<String, Object>>> getFriends(@RequestBody FriendRequestDTO request) {
//
//        /// Only the senderID is needed here
//        User user = userService.findUserByID(request.getSenderID());
//
//        if (user == null) {
//            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
//        }
//
//        List<Map<String, Object>> friends = userService.getFriends(user);
//
//        return new ResponseEntity<>(friends, HttpStatus.OK);
//    }

//    //POST /friends/add: Send a friend request
//    @PostMapping("/friends/add")
//    public ResponseEntity<String> sendFriendRequest(@RequestBody User requestSender, @RequestBody User requestReceiver)
//    {
//        ///the User objects only contain sender and receiver IDs
//        User sender = userService.findUserByID(requestSender.getId());      ///rest of the values will be set to null
//        User receiver = userService.findUserByID(requestReceiver.getId());  ///rest of the values will be set to null
//
//        //if either user doesn't exist
//        if (sender == null || receiver == null) {
//            return new ResponseEntity<>("Sender or Receiver not found", HttpStatus.NOT_FOUND);
//        }
//
//        userService.sendFriendRequest(sender, receiver);
//
//        return new ResponseEntity<>("Friend request sent successfully", HttpStatus.OK);
//    }

    //    public ResponseEntity<String> sendFriendRequest(@RequestBody FriendRequestDTO request) {
//
//        ///get sender and receiver from UserService using IDs from the DTO
//        User sender = userService.findUserByID(request.getSenderID());
//        User receiver = userService.findUserByID(request.getReceiverID());
//
//        ///if either user does not exist
//        if (sender == null || receiver == null) {
//            return new ResponseEntity<>("Sender or Receiver not found", HttpStatus.NOT_FOUND);
//        }
//
//        userService.sendFriendRequest(sender, receiver);
//
//        return new ResponseEntity<>("Friend request sent successfully", HttpStatus.OK);
//    }

//        public ResponseEntity<String> acceptFriendRequest(@RequestParam Integer senderId, @RequestParam Integer receiverId)
//    {
//        User sender = userService.findUserByID(senderId);
//        User receiver = userService.findUserByID(receiverId);
//
//        if (sender == null || receiver == null) {
//            return new ResponseEntity<>("Sender or Receiver not found", HttpStatus.NOT_FOUND);
//        }
//
//        userService.acceptFriendRequest(sender, receiver);
//
//        return new ResponseEntity<>("Friend request accepted", HttpStatus.OK);
//    }
//
//    public ResponseEntity<String> acceptFriendRequest(@RequestBody FriendRequestDTO request) {
//        User sender = userService.findUserByID(request.getSenderId());
//        User receiver = userService.findUserByID(request.getReceiverId());
//
//        if (sender == null || receiver == null) {
//            return new ResponseEntity<>("Sender or Receiver not found", HttpStatus.NOT_FOUND);
//        }
//
//        userService.acceptFriendRequest(sender, receiver);
//
//        return new ResponseEntity<>("Friend request accepted", HttpStatus.OK);
//    }

}
