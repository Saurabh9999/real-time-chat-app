async function resetPassword(){
    const email = document.getElementById("username").value;
    const newPassword = document.getElementById("password").value; 
    const otp = document.getElementById("otp").value;

    const res = await fetch("http://localhost:3000/api/user/email/reset-password",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({email,otp,newPassword})
    });
    const data = await res.json();
    if(data.success){
        alert(data.message)
        window.location.href = "login.html"
    }else{
        alert("Failed to reset password")
    }
}