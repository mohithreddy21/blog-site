import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import pkg from "pg";
import bcrypt from "bcrypt";
import { error } from "console";
import multer from "multer";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";



const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));




const {Pool} = pkg;
const pool = new Pool({
    user:"postgres",
    password:"mohithreddy",
    port:5432,
    database:"blog",
    host:"localhost"
});

const pgSession = connectPgSimple(session);


const storage = multer.diskStorage({
    destination : function(req,file,cb){
        cb(null,path.join(__dirname,"public","assets","images"))
    },
    filename: function(req,file,cb){
        cb(null,Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({storage:storage});

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(session({
    store: new pgSession({
        pool: pool,
        tableName:"session",
        createTableIfMissing:true
    }),
    secret:"mysupersecretkey",
    resave:false,
    saveUninitialized:false,
    cookie:{secure:false}
}))





app.get("/",(req,res)=>{
    res.render("register");
});

app.post("/register",async (req,res)=>{
    const client = await pool.connect();
    const {name,email,password} = req.body;
    console.log(req.body);
    try{
        const hashedPassword = await bcrypt.hash(password,10);
        const result = await client.query("SELECT * FROM users WHERE email = $1",[email]);
        if(result.rows.length > 0){
            console.log("User already registered");
            return res.json({success:true,message:"User already registered"})
        }
        else{
            await client.query("INSERT INTO users (name,email,password) VALUES ($1,$2,$3)",[name,email,hashedPassword]);
            res.json({
                success:true,
                message:"Registration Successfull"
            });
        }
    }
    catch(error){
        console.log("Error executing queries",error);
        res.status(500).json({error:"Error"});
    }
    finally{
        client.release();
    }
})

app.get("/loginPage",(req,res)=>{
    res.render("login");
})

let userDetails;

app.post("/submit",async (req,res)=>{
    const {email,password} = req.body;
    const client = await pool.connect();
    try{
        const result = await client.query("SELECT * FROM users WHERE email = $1",[email]);
        if(result.rows.length > 0){
            const storedHashedPassword = result.rows[0].password;
            userDetails = result.rows[0];
            bcrypt.compare(password,storedHashedPassword,(err,result)=>{
                if(err){
                    console.error("Error comparing passwords",err);
                }
                else if(result){
                    console.log("Password Matched");
                    res.redirect("/home");
                }
                else{
                    console.log("Incorrect Password");
                }
            })
        }
        else{
            console.log("User is not registered");
            res.redirect("/loginPage");
        }
    }
    catch(error){
        console.log("Error");
    }
    finally{
        client.release();
    }
})

console.log(userDetails);
app.use((req,res,next)=>{
    res.locals.profileDetails = userDetails;
    next(); 
})
app.get("/home",async (req,res)=>{
    const client = await pool.connect();
    try{
        const Data = await client.query("SELECT postid AS post_id, posts.title, posts.content, users.name AS author FROM posts JOIN users ON posts.userid = users.id;");
        if(Data.rows.length > 0){
            const Posts = Data.rows;
            console.log(Posts);
            res.locals.posts = Posts;
        }
    }
    catch(error){
        console.log("Error executing queries");
    }
    finally{
        client.release();
    }
    res.render("index");
})

app.get("/myposts",async (req,res)=>{
    const client = await pool.connect();
    const userId = userDetails.id;
    try{
        const Data = await client.query("SELECT * FROM posts WHERE userid = $1;",[userId]);
        if(Data.rows.length > 0){
            const Posts = Data.rows;
            console.log(Posts);
            res.locals.posts = Posts;
        }
    }
    catch(error){

    }
    finally{
        client.release();
    }
    res.render("myposts");
})


app.get("/profile",(req,res)=>{
    res.render("profile",{profileDetails : userDetails});
})

app.patch("/profile",upload.single("profile-picture"),async (req,res)=>{
    console.log(userDetails);
    const userId = userDetails.id;
    const {name,email,bio} = req.body;
    const profilePicture = req.file ? req.file.filename : null;
    if(req.body.name !== undefined) userDetails.name = name;
    if(req.body.email !== undefined) userDetails.email = email;
    if(req.body.bio !== undefined) userDetails.bio = bio;
    if(req.file) userDetails.profile_picture = profilePicture;

    const client = await pool.connect();
    try{
        await client.query("UPDATE users SET name = $1,email = $2,bio = $3,profile_picture = $4 WHERE id = $5",[userDetails.name,userDetails.email,userDetails.bio,userDetails.profile_picture,userId])
        res.json({ redirect: "/home" });
    }
    catch(error){
        console.log("Error executing queries");
    }
    finally{
        client.release();
    }
})


app.get("/create",(req,res)=>{
    res.render("create",{profileDetails:userDetails});
})

app.post("/create",async (req,res)=>{
    const {title,content} = req.body;
    console.log(req.body);
    const userId = userDetails.id;
    const client = await pool.connect();
    try{
        const checkPost = await client.query("SELECT * FROM posts WHERE userid = $1 AND title = $2",[userId,title]);
        if(checkPost.rows.length > 0){
            return res.status(409).json({ success: false, message: "Duplicate post title. Try a different one." });
        }



        await client.query("INSERT INTO posts (userid,title,content) VALUES ($1,$2,$3)",[userId,title,content]);
        res.json({success:true});
    }
    catch(error){
        console.error("Database error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
    finally{
        client.release();
    }

})


app.listen(port,()=>{
    console.log(`Server running from ${port}`);
});