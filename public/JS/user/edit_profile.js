
const socket = io();

// modifier le nom d'utilisateur
const form_change_username = document.getElementById("form_change_username");
const change_username = document.getElementById("change_username");
const username_errors = document.getElementById("username_errors");

// modifier le mot de passe
const form_change_password = document.getElementById("form_change_password");
const password_errors = document.getElementById("password_errors");
const current_password = document.getElementById("current_password");
const new_password = document.getElementById("new_password");

// modifier l'adresse email
const form_change_email = document.getElementById("form_change_email");
const email_errors = document.getElementById("email_errors");
const change_email = document.getElementById("change_email");

// modifier le pays
const countries = document.querySelectorAll(".countries > li");



// formulaire pour changer le nom d'utilisateur
form_change_username.addEventListener("submit", function(event){
    event.preventDefault();

    const form_data = new FormData(form_change_username);
    const username = form_data.get("change_username").trim();

    // on envoie les données au serveur
    fetch("/utilisateur/nouveau_nom", {
        method : "post",
        headers : {
            "Content-Type" : "application/json"
        },
        body : JSON.stringify({username}),
        credentials : "same-origin"
    })

    // en cas de réponse du serveur
    .then(res => res.json())
    .then(data => {
        if (data.correct){
            username_errors.classList.add("success", "oe");
            username_errors.textContent = `${data.success}`;
            setTimeout(function(){
                location.reload();
            }, 2000);
        } else {
            username_errors.classList.add("failure", "oe");
            username_errors.textContent = `${data.error}`;
        }
    })

    // en cas d'erreur
    .catch(error => {
        username_errors.classList.add("failure", "oe");
        username_errors.textContent = "Une erreur est survenue lors du changement de nom d'utilisateur" + error;
    })
})



// formulaire pour changer le mot de passe
form_change_password.addEventListener("submit", function(event){
    event.preventDefault();

    const form_data = new FormData(form_change_password);
    const currentPassword = form_data.get("current_password").trim();
    const newPassword = form_data.get("new_password").trim();

    // on envoie les données au serveur
    fetch("/utilisateur/mot_de_passe", {
        method : "post",
        headers : {
            "Content-Type" : "application/json"
        },
        body : JSON.stringify({currentPassword, newPassword}),
        credentials : "same-origin"
    })


    .then(res => res.json())
    .then(data => {
        if (data.correct){
            password_errors.classList.add("success", "oe");
            password_errors.textContent = `${data.success}`;
            setTimeout(function(){
                location.reload();
            }, 2000);
        } else {
            password_errors.classList.add("failure", "oe");
            password_errors.textContent = `${data.error}`;
        }
    })

    .catch(error => {
        password_errors.classList.add("failure", "oe");
        password_errors.textContent = "Une erreur est survenue lors du changement de mot de passe";
    })
})



// formulaire pour changer l'adresse email
form_change_email.addEventListener("submit", function(event){
    event.preventDefault();

    const form_data = new FormData(form_change_email);
    const email = form_data.get("change_email").trim();


    // on envoie les données au serveur
    fetch("/utilisateur/email", {
        method : "post",
        headers : {
            "Content-Type" : "application/json"
        },
        body : JSON.stringify({email}),
        credentials : "same-origin"
    })


    .then(res => res.json())
    .then(data => {
        if (data.correct){
            email_errors.classList.add("success", "oe");
            email_errors.textContent = `${data.success}`;
            setTimeout(function(){
                location.reload();
            }, 2000);
        } else {
            email_errors.classList.add("failure", "oe");
            email_errors.textContent = `${data.error}`;
        }
    })

    .catch(error => {
        email_errors.classList.add("failure", "oe");
        email_errors.textContent = "Une erreur s'est produite lors du changement d'adresse email";
    })
})


// Changer le pays
countries.forEach(country => {
    country.addEventListener("click", function(){
        console.log(`Pays sélectionné : ${country.id}`);
    })
})