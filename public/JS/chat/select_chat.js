//const socket = io({autoConnect : false});
const socket = io();

const room_container = document.getElementById("room_container");
const public_room = document.getElementById("public_room");
const private_room = document.getElementById("private_room");
const public_room_selected = document.getElementById("public_room_selected");
const private_room_selected = document.getElementById("private_room_selected");
const go_back_public = document.getElementById("go_back_public");
const go_back_private = document.getElementById("go_back_private");

public_room.addEventListener("click", function(){
    room_container.classList.add("hide");
    public_room_selected.classList.remove("hide");
})

private_room.addEventListener("click", function(){
    room_container.classList.add("hide");
    private_room_selected.classList.remove("hide");
})

// Retourner en arrière pour changer le type de salon
go_back_public.addEventListener("click", function(){
    public_room_selected.classList.add("hide");
    room_container.classList.remove("hide");
})

go_back_private.addEventListener("click", function(){
    private_room_selected.classList.add("hide");
    room_container.classList.remove("hide");
})

// salon public
const create_public_room = document.getElementById("create_public_room");
const create_public_room_errors = document.getElementById("create_public_room_errors");
const create_public_room_name = document.getElementById("create_public_room_name");


create_public_room.addEventListener("submit", function(event){
    event.preventDefault();

    const public_room_name = create_public_room_name.value.trim();

    fetch("/chat/salon_public", {
        method : "post",
        headers : {
            "Content-Type" : "application/json"
        },
        body : JSON.stringify({public_room_name}),
        credentials : "same-origin"
    })

    .then(res => res.json())
    .then(data => {
        create_public_room_errors.className = "";
        if (data.correct){
            create_public_room_errors.classList.add("success", "oe");
            create_public_room_errors.textContent = `${data.success}`;
            create_public_room_name.value = "";
        } else {
            create_public_room_errors.classList.add("failure", "oe");
            create_public_room_errors.textContent = `${data.error}`;
        }
    })

    .catch(error => {
        create_public_room_errors.classList.add("failure", "oe");
        create_public_room_errors.textContent = "Une erreur est survenue";
    })
})



// salon privé
const create_private_room = document.getElementById("create_private_room");
const create_private_room_errors = document.getElementById("create_private_room_errors");
const create_private_room_name = document.getElementById("create_private_room_name");
const create_private_room_password = document.getElementById("create_private_room_password");
const create_private_room_confirm = document.getElementById("create_private_room_confirm");


create_private_room.addEventListener("submit", function(event){
    event.preventDefault();
    const form_data = new FormData(create_private_room);
    const room_name = form_data.get("create_private_room_name").trim();
    const room_code = form_data.get("create_private_room_password").trim();
    const room_code_confirm = form_data.get("create_private_room_confirm").trim();


    fetch("/chat/salon_prive", {
        method : "post",
        headers : {
            "Content-Type" : "application/json"
        },
        body : JSON.stringify({room_name, room_code, room_code_confirm}),
        credentials : "same-origin"
    })


    .then(res => res.json())
    .then(data => {
        create_private_room_errors.textContent = "";
        create_private_room_errors.className = "";
        if (data.correct){
            create_private_room_errors.classList.add("success", "oe");
            create_private_room_errors.textContent = `${data.error}`;
        } else {
            create_private_room_errors.classList.add("failure", "oe");
            data.error.forEach(error => {
                const li = document.createElement("li");
                li.textContent = error;
                create_private_room_errors.appendChild(li);
            })
        }
    })


    .catch(error => {
        create_private_room_errors.classList.add("failure", "oe");
        create_private_room_errors.textContent = "Une erreur est survenue";
    })
})