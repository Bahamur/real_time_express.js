const form_login = document.getElementById("form_login");
const login_username = document.getElementById("login_username");
const login_password = document.getElementById("login_password");
const login_submit = document.getElementById("login_submit");
const show_errors = document.getElementById("errors");
const hide_show_password = document.getElementById('hide_show_password');

const arrow_nav_log = [login_username, login_password];

addEventListener('load', function(){
    arrow_nav_log.forEach(input => {
        input.value = '';
    })
})

addEventListener('keydown', function(event){
    if (event.key === 'ArrowUp'){
        login_username.focus();
    }
})

hide_show_password.addEventListener('click', function(){
    if (login_password.type === 'password'){
        login_password.type = 'text';
        hide_show_password.textContent = '🐵';
    } else {
        login_password.type = 'password';
        hide_show_password.textContent = '🙈';
    }
})



login_username.focus();

arrow_nav_log.forEach(input => {
    input.addEventListener("keydown", function(event){
        switch(input.id){
            case 'login_username':
                if (event.key === 'ArrowDown'){
                    login_password.focus();
                }
                break;
            case 'login_password':
                if (event.key === 'ArrowUp'){
                    login_username.focus();
                }
        }
        
    })
})




// Soumettre le formulaire avec AJAX
form_login.addEventListener("submit", function(event){
    event.preventDefault();

    const username = login_username.value.trim();
    const password = login_password.value.trim();

    if (username !== '' && password !== ''){
        // envoi des données au serveur
        fetch("/login", {
            method : "post",
            headers : {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({username, password}),
            credentials : "same-origin"
        })

        // en cas de réponse du serveur
        .then(res => res.json())
        .then(data => {
            if (data.correct){
                // si les identifiants sont corrects, on redirige l'utilisateur vers la page d'accueil
                login_submit.disabled = true;
                arrow_nav_log.forEach(input => {
                    input.readOnly = true;
                })
                show_errors.classList.add("success", "oe");
                show_errors.textContent = `${data.error}`;
                setTimeout(function(){
                    location.href = "/";
                }, 2000);
            } else {
                show_errors.classList.add("failure", "oe");
                show_errors.textContent = `${data.error}`;
                login_password.value = '';
            }
        })

        // en cas d'erreur
        .catch(error => {
            console.log(`Une erreur est survenue lors de l'identification de l'utilisateur`);
        })

    } else {
        show_errors.classList.add("failure", "oe");
        show_errors.textContent = 'Veuillez remplir tous les champs';
    }

})