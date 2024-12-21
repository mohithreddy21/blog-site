import express from "express";
import bodyParser from "body-parser";
import {dirname} from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import multer from "multer";


const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));


const storage = multer.diskStorage({
    destination : function(req,file,cb){
        cb(null, path.join(__dirname,"public","images"));
    },
    filename : function(req,file,cb){
        cb(null, Date.now()+path.extname(file.originalname));
    },
})

const upload = multer({storage : storage});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));


let profileDetails = {};
const blogs = [];


app.use((req,res,next)=>{

    res.locals.posts = blogs;
    res.locals.imagesPath = imagesPath;
    next();
})


app.get("/",(req,res)=>{
    res.render("index.ejs");
})

app.get("/myposts",(req,res)=>{
    res.render("myposts.ejs");
})


app.get("/create",(req,res)=>{
    res.render("create.ejs");
})

app.get("/profile",(req,res)=>{
    res.render("profile.ejs");
})

let imagesPath = __dirname + path.join("/","public","images","one.jpg");


let avatar;


app.post("/profile",upload.single("profile-picture"),(req,res)=>{

    res.locals.profileDetails = req.body;
    res.locals.imageDetails = req.file;
    res.render("profile.ejs");
})




app.get("/home",(req,res)=>{
    res.redirect("/");
})

app.post("/create",(req,res)=>{
    console.log(req.body);
    let newPost = req.body;
    blogs.push(newPost);
    res.render("create.ejs",newPost);
})


app.listen(port,()=>{
    console.log(`Server running on ${port}`);
})