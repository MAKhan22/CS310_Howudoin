package edu.sabanciuniv.howudoin.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Message {

//    @Id
//    private String id;                  ///String to ensure auto_generation of ids
    private String sender;
    private String receiver;          ///for both groupName and receiver's Email
    private String content = "";

    private Date sendDate = new Date();         ///message sent (initialized at creation)
//    private Date updateDate;                  //message updated
}
