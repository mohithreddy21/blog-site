import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import pkg from "pg";
import bcrypt from "bcrypt";
import multer from "multer";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";



const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));
env.config();




const {Pool} = pkg;
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database:process.env.DB_DATABASE,
    host:process.env.DB_HOST
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
    secret: process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{secure:false}
}))


app.use(passport.initialize());
app.use(passport.session());




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



app.post("/submit",passport.authenticate("local",{
    successRedirect:"/home",
    failureRedirect:"/loginPage"
})
)


app.use((req,res,next)=>{
    res.locals.profileDetails = req.user;
    next(); 
})


app.get("/home",async (req,res)=>{
    console.log("Is Authenticated?", req.isAuthenticated());
    console.log("Session User:", req.user);
    console.log(req.user);
    const userId = req.user.id;
    if(req.isAuthenticated()){
        const userId = req.user.id;
        const client = await pool.connect();
        try{
            const Data = await client.query("SELECT postid AS post_id, posts.title, posts.content, users.name AS author FROM posts JOIN users ON posts.userid = users.id;");
            if(Data.rows.length > 0){
                const Posts = Data.rows;
                // console.log(Posts);
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
    }
    else{
        res.redirect("/loginPage");
    }
})

app.get("/myposts",async (req,res)=>{
    if(req.isAuthenticated()){
        const client = await pool.connect();
        const userId = req.user.id;
        try{
            const Data = await client.query("SELECT * FROM posts WHERE userid = $1;",[userId]);
            if(Data.rows.length > 0){
                const Posts = Data.rows;
                console.log(Posts);
                res.locals.posts = Posts;
            }
        }
        catch(error){
            console.log(error);
        }
        finally{
            client.release();
        }
        res.render("myposts");
    }
    else{
        res.redirect("/loginPage");
    }
})


app.get("/profile",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("profile",{profileDetails : req.user});
    }
    else{
        res.redirect("/loginPage");
    }
})

app.patch("/profile",upload.single("profile-picture"),async (req,res)=>{
    const userId = req.user.id;
    const {name,email,bio} = req.body;
    const profilePicture = req.file ? req.file.filename : null;
    if(req.body.name !== undefined) req.user.name = name;
    if(req.body.email !== undefined) req.user.email = email;
    if(req.body.bio !== undefined) req.user.bio = bio;
    if(req.file) req.user.profile_picture = profilePicture;

    const client = await pool.connect();
    try{
        await client.query("UPDATE users SET name = $1,email = $2,bio = $3,profile_picture = $4 WHERE id = $5",[name,email,bio,profilePicture,userId])
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
    if(req.isAuthenticated()){
        res.render("create",{profileDetails:req.user});
    }
    else{
        res.redirect("/loginPage");
    }
})

app.post("/create",async (req,res)=>{
    const {title,content} = req.body;
    console.log(req.body);
    const userId = req.user.id;
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


app.get("/delete",async (req,res)=>{
    if(req.isAuthenticated()){
        const postId = req.query.id;
        const client = await pool.connect();
        try{
            await client.query("DELETE FROM POSTS WHERE postid = $1",[postId]);
            res.redirect("/myposts");
        }
        catch(error){
            console.log("Error executing queries",error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
        finally{
            client.release();
        }
    }
    else{
        res.redirect("/loginPage");
    }
})


passport.use(new Strategy({ usernameField: "email", passReqToCallback: true },async function verify(req,email,password,cb) {
    const client = await pool.connect();
    try{
        const data = await client.query("SELECT * FROM users WHERE email = $1",[email]);
        if(data.rows.length > 0){
            const storedHashedPassword = data.rows[0].password;
            // userDetails = result.rows[0];
            await bcrypt.compare(password,storedHashedPassword,(err,result)=>{
                client.release();
                if(err){
                    return cb(err);
                }
                else if(result){
                    console.log("Password Matched");
                    const user = {
                        id: data.rows[0].id,
                        email: data.rows[0].email,
                        name: data.rows[0].name,
                        bio: data.rows[0].bio ?? null,
                        profile_picture: data.rows[0].profile_picture ?? null
                    }
                    req.session.user = user;
                    console.log("Session after setting user:", req.session);
                    return cb(null,user);
                }
                else{
                    console.log("Incorrect Password");
                    return cb(null,false);
                }
            })
        }
        else{
            client.release();
            return cb("User is not registered");
        }
    }
    catch(error){
        client.release();
        return cb(error);
    }
}
))

passport.serializeUser((user,cb)=>{
    cb(null,user);
})

passport.deserializeUser((user,cb)=>{
    cb(null,user);
})

app.listen(port,()=>{
    console.log(`Server running from ${port}`);
});