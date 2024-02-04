
const form_logout = document.getElementById("form_logout");
const show_errors = document.getElementById("errors");

form_logout.addEventListener("submit", function(event){
    event.preventDefault();

    // envoi des données au serveur
    fetch("/logout", {
        method : "post",
        headers : {
            "Content-Type" : "application/json"
        },
        credentials : "same-origin"
    })

    .then(res => res.json())
    .then(data => {
        if (data.correct){
            show_errors.classList.add("success", "oe");
            show_errors.textContent = `${data.error}`;
            setTimeout(function(){
                location.href = "/";
            }, 2000)
        } else {
            show_errors.classList.add("failure", "oe");
            show_errors.textContent = `${data.error}`;
        }
    })

    // en cas d'erreur
    .catch(error => {
        console.log(`Une erreur est survenue lors de la déconnexion de l'utilisateur`);
    })

})
