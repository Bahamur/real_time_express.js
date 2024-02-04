const form_register = document.getElementById("form_register");
const register_username = document.getElementById("register_username");
const register_email = document.getElementById("register_email");
const register_password = document.getElementById("register_password");
const register_password_confirm = document.getElementById("register_password_confirm");
const show_errors = document.getElementById("register_errors");

form_register.addEventListener("submit", function(event){
    event.preventDefault();
    show_errors.textContent = '';
    show_errors.className = '';

    const form_data = new FormData(form_register);

    const user = {
        username : form_data.get("register_username").trim(),
        email : form_data.get("register_email").toLowerCase().trim(),
        password : form_data.get("register_password").trim(),
        confirm_password : form_data.get("register_password_confirm").trim()
    };

    if (user.username === "" || user.email === "" || user.password === "" || user.confirm_password === ""){
        show_errors.classList.add("failure", "oe", "shake_animation");
        show_errors.textContent = "Veuillez compléter tous les champs";
    } else {
        fetch("/utilisateur/creer_un_compte", {
            method : 'post',
            headers : {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({user}),
            credentials : 'same-origin'
        })

        .then(res => res.json())
        .then(data => {
            window.scrollTo({
                top : 0,
                behavior : "smooth"
            });
            if (data.correct){
                show_errors.classList.add("success", "oe");
                show_errors.textContent = `${data.message}`;
                setTimeout(function(){
                    location.href = `${data.url}`;
                }, 1500);
            } else {
                show_errors.classList.add("failure");
                data.errors.forEach(error => {
                    const li = document.createElement("li");
                    li.textContent = error;
                    show_errors.appendChild(li);
                })
            }
        })

        .catch(error => {
            show_errors.classList.add("failure", "oe");
            show_errors.textContent = "Une erreur est survenue";
        })
    }
})
