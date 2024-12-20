$(".btn-create").on("click",function(){
    window.location.href = "/create";
})

$(".btn-reset").on("click",function(){
    $("#post-title").text = "";
    $("#post-content").text = "";
    $("#post-tags").text = "";
})

