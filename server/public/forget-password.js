async function forgetPassword(){
    const email = document.getElementById("email").value;

    const res = await fetch("http://localhost:3000/api/user/email/forget-password",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({email})
    });
    const data = await res.json();
    if(data.success){
        alert(data.message)
        window.location.href = "reset-password.html"
    }else{
        alert("Failed to send otp")
    }
}