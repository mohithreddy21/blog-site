import express from "express";
import bodyParser from "body-parser";


const app = express();
const port = 3000;


app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

const blogs = [];

app.get("/",(req,res)=>{
    res.render("index.ejs",{ posts : blogs});
})

app.get("/myposts",(req,res)=>{
    res.render("myposts.ejs",{ posts : blogs});
})


app.get("/create",(req,res)=>{
    res.render("create.ejs");
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