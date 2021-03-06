import React, { Component } from 'react';
import { Janus } from "../lib/janus";
import {Message, Button, Input} from "semantic-ui-react";
import {initChatRoom, getDateString, joinChatRoom, notifyMe} from "../shared/tools";
import {SHIDUR_ID} from "../shared/consts";


class ClientChat extends Component {

    state = {
        ...this.props,
        chatroom: null,
        input_value: "",
        messages: [],
        support_msgs: [],
        room_chat: true,
        from: null,
    };

    componentDidMount() {
        document.addEventListener("keydown", this.onKeyPressed);
    };

    componentWillUnmount() {
        document.removeEventListener("keydown", this.onKeyPressed);
    };

    initChat = (janus) => {
        initChatRoom(janus, null, chatroom => {
            Janus.log(":: Got Chat Handle: ", chatroom);
            this.setState({chatroom});
        }, data => {
            this.onData(data);
        });
    };

    initChatRoom = (user, room) => {
        joinChatRoom(this.state.chatroom,room,user);
        this.setState({room});
    };

    onKeyPressed = (e) => {
        if(e.code === "Enter")
            this.sendChatMessage();
    };

    exitChatRoom = (room) => {
        let {chatroom} = this.state;
        let chatreq = {textroom : "leave", transaction: Janus.randomString(12),"room": room};
        chatroom.data({text: JSON.stringify(chatreq),
            success: () => {
                Janus.log(":: Text room leave callback: ");
                this.setState({messages:[]});
            }
        });
    };

    onData = (data) => {
        Janus.log(":: We got message from Data Channel: ",data);
        var json = JSON.parse(data);
        var what = json["textroom"];
        if (what === "message") {
            // Incoming message: public or private?
            var msg = json["text"];
            msg = msg.replace(new RegExp('<', 'g'), '&lt');
            msg = msg.replace(new RegExp('>', 'g'), '&gt');
            var from = json["from"];
            var dateString = getDateString(json["date"]);
            var whisper = json["whisper"];
            if (whisper === true) {
                // Private message
                Janus.log("-:: It's private message: "+dateString+" : "+from+" : "+msg)
                let {support_msgs} = this.state;
                let message = JSON.parse(msg);
                message.time = dateString;
                support_msgs.push(message);
                this.setState({support_msgs, from});
                if(this.props.visible) {
                    this.scrollToBottom();
                } else {
                    notifyMe("Shidur",message.text,true);
                    this.setState({room_chat: false});
                    this.props.onNewMsg(true);
                }
            } else {
                // Public message
                let {messages} = this.state;
                let message = JSON.parse(msg);
                message.time = dateString;
                Janus.log("-:: It's public message: "+message);
                messages.push(message);
                this.setState({messages});
                if(this.props.visible) {
                    this.scrollToBottom();
                } else {
                    this.props.onNewMsg();
                }
            }
        } else if (what === "join") {
            // Somebody joined
            let username = json["username"];
            let display = json["display"];
            Janus.log("-:: Somebody joined - username: "+username+" : display: "+display)
        } else if (what === "leave") {
            // Somebody left
            let username = json["username"];
            //var when = new Date();
            Janus.log("-:: Somebody left - username: "+username+" : Time: "+getDateString())
        } else if (what === "kicked") {
            // Somebody was kicked
            // var username = json["username"];
        } else if (what === "destroyed") {
            let room = json["room"];
            Janus.log("The room: "+room+" has been destroyed")
        }
    };

    sendChatMessage = () => {
        let {input_value, user, from, room_chat, support_msgs} = this.state;
        let msg = {user, text: input_value};
        let pvt = room_chat ? "" : from ? {"to": from} : {"to": `${SHIDUR_ID}`};
        let message = {
            textroom: "message",
            transaction: Janus.randomString(12),
            room: this.state.room,
            ...pvt,
            text: JSON.stringify(msg),
        };
        this.state.chatroom.data({
            text: JSON.stringify(message),
            error: (reason) => { alert(reason); },
            success: () => {
                Janus.log(":: Message sent ::");
                this.setState({input_value: ""});
                if(!room_chat) {
                    support_msgs.push(msg);
                    this.setState({support_msgs});
                }
            }
        });
    };

    scrollToBottom = () => {
        this.refs.end.scrollIntoView({ behavior: 'smooth' })
    };

    render() {

        const {messages,support_msgs,room_chat} = this.state;

        let room_msgs = messages.map((msg,i) => {
            let {user,time,text} = msg;
            return (
                <div key={i}><p>
                    <i style={{color: 'grey'}}>{time}</i> -
                    <b style={{color: user.role === "admin" ? 'red' : 'blue'}}>{user.display}</b>:
                </p>{text}</div>
            );
        });

        let admin_msgs = support_msgs.map((msg,i) => {
            let {user,time,text} = msg;
            return (
                <div key={i}><p>
                    <i style={{color: 'grey'}}>{time}</i> -
                    <b style={{color: user.role === "admin" ? 'red' : 'blue'}}>{user.role === "admin" ? user.username : user.display}</b>:
                </p>{text}</div>
            );
        });

        return (
            <div className="chat-panel" >
                <Message attached className='messages_list'>
                    <div className="messages-wrapper">
                        {room_chat ? room_msgs : admin_msgs}
                        <div ref='end' />
                    </div>

                </Message>

                <Input fluid type='text' placeholder='Type your message' action value={this.state.input_value}
                       onChange={(v,{value}) => this.setState({input_value: value})}>
                    <input />
                    <Button size='mini' positive onClick={this.sendChatMessage}>Send</Button>
                </Input>
            </div>
        );

    }
}

export default ClientChat;