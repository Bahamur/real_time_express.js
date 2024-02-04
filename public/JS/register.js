const socket = io( {autoConnect : false} )

// récupérer les éléments par leur id
const form_register = document.getElementById("form_register");
const register_username = document.getElementById("register_username");
const register_email = document.getElementById("register_email");
const register_password = document.getElementById("register_password");
const register_password_confirm = document.getElementById("register_password_confirm");
const show_errors = document.getElementById("errors");

// soumettre le formulaire
form_register.addEventListener("submit", function(event){
    event.preventDefault();

    const form_data = new FormData(form_register);

    const user = {
        username : form_data.get("register_username").trim(),
        email : form_data.get("register_email").toLowerCase(),
        password : form_data.get("register_password"),
        confirm_password : form_data.get("register_password_confirm")
    };

    if (user.username === "" | user.email === "" | user.password === "" | user.confirm_password === ""){
        show_errors.classList.add("failure", "oe");
        show_errors.textContent = "Veuillez compléter tous les champs";
    } else {
        socket.emit("register_new_client", user);
    }
})


socket.on("register_server_validation", function(object_errors){
    show_errors.textContent = "";
    show_errors.className = "";
    if (object_errors.correct){
        show_errors.classList.add("success", "oe");
        show_errors.textContent = `Succès`;
    } else {
        show_errors.classList.add("failure");
        object_errors.errors.forEach(error =>{
            const li = document.createElement("li");
            li.textContent = error;
            show_errors.appendChild(li);
        })
    }
})