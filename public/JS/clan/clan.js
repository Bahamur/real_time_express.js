const clan_creation_form = document.getElementById("clan_creation_form");
const clan_creation_name = document.getElementById("clan_creation_name");
const clan_errors = document.getElementById("clan_errors");

clan_creation_form.addEventListener("submit", function(event){
    clan_errors.className = '';
    clan_errors.textContent = '';
    event.preventDefault();

    const clan = clan_creation_name.value.trim();

    if (clan !== ""){
        fetch("/clan/new_clan", {
            method : 'post',
            headers : {
                'Content-Type' : 'application/json'
            },
            body : JSON.stringify({clan}),
            credentials : 'same-origin'
        })

        .then(res => res.json())
        .then(data => {
            if (data.correct){
                clan_errors.classList.add("success", "oe");
                clan_errors.textContent = `${data.success}`;
                clan_creation_name.value = '';
                
            } else {
                clan_errors.classList.add("failure", "oe");
                clan_errors.textContent = `${data.error}`;
            }
        })
    } else {
        clan_errors.classList.add("failure", "oe");
        clan_errors.textContent = "Le nom du clan n'est pas valide";
    }
})