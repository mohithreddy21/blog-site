
document.getElementById("registerForm").addEventListener("submit",function(event){
    event.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if(password !== confirmPassword){
        return;
    }

    const userData = {name,email,password};

    async function sendUserData(userData){
        try{
            const response = await fetch("/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if(data.success){
                window.location.href = "/loginPage";
            }
            else{
                console.log(data.message||"Registration failed");
            }

        }
        catch(error){
            console.log("Error:",error);
        }

    }
    sendUserData(userData);

})