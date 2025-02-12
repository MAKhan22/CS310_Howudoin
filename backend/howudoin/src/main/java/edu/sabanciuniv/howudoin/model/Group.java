package edu.sabanciuniv.howudoin.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Group {

//    @Id
//    private String id;                      ///String to ensure auto_generation of ids

    @Id
    private String name;                    ///should be unique (for group creation purposes)

    private List<String> members = new ArrayList<>();         ///emails of members
    private Date creationDate =  new Date();                  ///creation date of grp

    ///for more efficiency in performance (instead of searching through the whole message repo)
    ///at the cost of heavier cache load and data sync problems:
//    private List<String> messageIDs = new ArrayList<>();        ///List of message IDs
}
