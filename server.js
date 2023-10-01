const express=require("express");
const app=express();
const server=require("http").createServer(app);
const bodyParser=require("body-parser");
const fetch = require("node-fetch")
let words_assert=[]
let five = null




const ejs=require("ejs");
const { urlencoded } = require("body-parser");
const {Server}= require("socket.io");
const { isObject } = require("util");
const text = require("body-parser/lib/types/text");
const io = new Server(server,{
    cors:{
    origin:"https://lettertrap.onrender.com",
    methods:["GET","POST"]
    }
})
const port=process.env.PORT||3000;
app.use(express.static("static"));



// Function to fetch data and store it in the global variable
async function fetchDataOnce() {
  if (five === null) { // Check if data has already been fetched
    await fetch('https://random-word-api.herokuapp.com/word?number=9000&length=5')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Store the fetched data in the global variable
        five = data;
        
      })
      .catch(error => {
        console.error('Fetch error:', error);
      });
  } else {
   
  }
}
fetchDataOnce();
setTimeout(()=>{
 console.log(five)
},3000)

app.get("/test",(req,res)=>{
    res.render("gametest",{})
})
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:false}));

let rooms={};
app.post("/createRoom",(req,res)=>{
    let room=req.body.room;
    let name=req.body.name;
    let mode="host";
    let message="* Room Name already exists *"
    if( !rooms[room].created){
        rooms[room].created=true;
        let roomname="/"+room+"/lobby"+"/?name="+name+"&"+"mode="+mode;
        return res.redirect(roomname);
    } 
    else
    return res.redirect("/?message="+message);
});
app.get("/testgame",(req,res)=>{
    res.render("game",{room:"room",name:"name",time:1});
})


app.post("/joinRoom",(req,res)=>{ 
    let room=req.body.room;
    let name=req.body.name_join;
    let mode="player";
    let dup='duplicate'
    let message="* Sorry! Room is either full or admin has begun the round......Maybe next time :( *"
    
     if(rooms[room]!=undefined && rooms[room].limit<4 && rooms[room].started==false && Object.keys(rooms[room].players).length!=0){
         
         if(Object.keys(rooms[room].players).indexOf(dup) > -1){
         delete rooms[room].players[dup];
         return res.redirect("/?message=A player with the same name Exists please Choose a different name to continue");
         }
         rooms[room].limit++;
        let roomname="/"+room+"/lobby"+"/?name="+name+"&"+"mode="+mode;
        res.redirect(roomname);
    }
  
    else
    return res.redirect("/?message="+message);
});
app.get("/",(req,res)=>{
    let message=req.query.message
    res.render("home",{message:message});
});

app.get("/:room/lobby",(req,res)=>{
    let room=req.params.room;
    let name=req.query.name;
    let mode=req.query.mode;
    let message="* Sorry! Room is either full or admin has begun the round......Maybe next time :( *"
    try{
    if(rooms[room]){
    if(rooms[room].started==false){
    let time=rooms[room].time_limit;
    let word=rooms[room].num_words;
    res.render("lobby",{roomName:room,name:name,mode:mode,time:time,word:word});
    }
    else
    return res.redirect("/?message="+message);
    }
    else
    return res.redirect("/?message="+message);

   
    }
    catch(e){
        res.redirect("/");
    }
});



app.get("/:room/game",async (req,res)=>{
    let room=req.params.room;
    let name=req.query.name;
    let message="* Error has occured try again!!"
    try{
  
    res.render("game",{room:room,name:name,time:rooms[room].time_limit,words:words_assert,five:five});
    }
    catch(e){
        return res.redirect("/?message="+message);
    }
   
});


async function getRandomWords(room){
    const response = await fetch("https://random-word-api.herokuapp.com/word?number="+rooms[room].num_words+"&length=5");
    const words = await response.json();
    return words;
}

app.post("/Game",async (req,res)=>{
    let room=req.body.room;
    let name=req.body.name;
    
    try{
    let route="/"+room+"/game"+"?name="+name;
    let words = await getRandomWords(room)
    words_assert=words
    rooms[room].words=words_assert;
        if(rooms[room].limit>1){
          res.redirect(route);
       
        }
    else
      {
          delete rooms[room];
          res.redirect("/");
      }
    

    
    

   
   
    
    }
    catch(e){
        delete rooms[room];
        res.redirect("/");
    }
})


io.on('connection',socket=>{
    socket.on("send-user-info",room=>{
        socket.join(room);
        socket.to(room).emit("display-users",rooms[room].players,rooms[room].score);
    });
    socket.on("display_names",(name,room)=>{
        socket.to(room).emit("players",rooms[room].players,rooms[room].score);
    });
    socket.on("points",(person,room,score)=>{
        try{
        rooms[room].score[person]=score;
        socket.to(room).emit("players",rooms[room].players,rooms[room].score);
        }
        catch(e){

        }
    })

    socket.on("allow_disp",(per_name,room)=>{
        rooms[room].finished[per_name]=true;
        socket.to(room).emit("show_scores",rooms[room].finished,rooms[room].players,rooms[room].score);
    })
    socket.on("show_in_screen",room=>{
        socket.to(room).emit("show_scoreboard_on_own_screen",rooms[room].players,rooms[room].score);
    })
    socket.on("disconnect",()=>{
        try{
       let room=socket.handshake.query.room;
        let name=socket.handshake.query.name;
        let running=socket.handshake.query.running;
        if(!rooms[room].started || running=="true"){
       Object.keys(rooms[room].players).map(person=>{
           if(rooms[room].players[person]==name)delete rooms[room].players[person];
           if(Object.keys(rooms[room].players).length==0)delete rooms[room];
       })
       socket.to(room).emit("players",rooms[room].players,rooms[room].score);
        }
      }
      catch(e){ 
      }
     });
});
io.on('connection',socket=>{
    socket.on("user-display",room=>{
        socket.join(room);
        socket.to(room).emit("user_show",rooms[room].players);
    });
    socket.on("display_name",(name,room)=>{
        socket.to(room).emit("user_name",rooms[room].players);
    });
   
   socket.on("start",(room,name)=>{
    let route="/"+room+"/game";
    rooms[room].started=true;
    setTimeout(()=>{
        socket.to(room).emit("start_game",route);
    },2000)
    
   });

   socket.on("Time",(val,room)=>{
    rooms[room].time_limit=val;
       socket.to(room).emit("ChangeTime",val);
   });

   socket.on("Word",(val,room)=>{
       rooms[room].num_words=val
    socket.to(room).emit("ChangeWord",val);
});

 socket.on("disconnect",()=>{
     try{
    let room=socket.handshake.query.room;
     let name=socket.handshake.query.name;
     let running=socket.handshake.query.running;
     console.log(rooms[room].players)
     if(!rooms[room].started || running=="true"){
        console.log(rooms[room].players)
    Object.keys(rooms[room].players).map(person=>{
        if(rooms[room].players[person]==name){
            delete rooms[room].players[person];
            delete rooms[room].finished[name];
        }
        if(rooms[room].players=={})delete rooms[room];
    })
    socket.to(room).emit("user_name", rooms[room].players);
     }
   }
   catch(e){ 
   }
  });

 

});

io.on('connection',socket=>{
   
   socket.on("new_player",(per_name,room)=>{
    if(rooms[room]==undefined);
    else{
    console.log( Object.values(rooms[room].players).indexOf(per_name))
    if(rooms[room]!=undefined && rooms[room].limit<=4 && rooms[room].started==false 
        && Object.keys(rooms[room].players).length!=0 && Object.values(rooms[room].players).indexOf(per_name) == -1
        ){
    //  var foundName=(per)=>{
    //     Object.keys(rooms[room].players).map(person=>{
    //         if(rooms[room].players[person]==per)return true;
    //         console.log(rooms[room].players[person]);
    //     })
    //     return false;
    //  }
   
    socket.join(room);
    
    
    rooms[room].players[socket.id]=per_name;
    rooms[room].score[per_name]=0;
    rooms[room].finished[per_name]=false;
    rooms[room].created=false;
    socket.to(room).emit("user-connected",(rooms[room].players));
}
else{
    console.log("Hi")
    rooms[room].players['duplicate']=per_name;
    console.log( Object.keys(rooms[room].players).indexOf('duplicate'))
     }
    }
   });

   socket.on("new_host",(per_name,room)=>{
    if(rooms[room]==null){
        rooms[room]={players:{},limit:1,host:per_name,created:false,num_words:4,time_limit:7,started:false,score:{},running:false,words:[],finished:{}};
       socket.join(room);
       rooms[room].players[socket.id]=per_name;
       rooms[room].score[per_name]=0;
       rooms[room].finished[per_name]=false;
       socket.to(room).emit("user-connected",rooms[room].players);
       
    } 
   })
});


server.listen(port,()=>{
    console.log("Server at 8080 running");
})
