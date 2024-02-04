const socket = io();

const forum_messages = document.querySelector(".forum_messages");
const forum_post_messages = document.getElementById("forum_post_messages");
const forum_post_message = document.getElementById("forum_post_message");
const messages_errors = document.getElementById("messages_errors");
const notifications = document.querySelector('.notifications');

socket.on('message', function(data){
    notifications.classList.add('notifications', 'oe');
    notifications.textContent = "Vous avez reçu un message";
    setTimeout(function(){
        notifications.classList.add('hide');
    }, 2000);
    console.log(data);
})

const dataset = forum_messages.dataset.currentProblem;

socket.on("forum_insert_message", function(data){
    if (!data.correct){
        messages_errors.classList.add("failure", "oe");
        messages_errors.textContent = `${data.error}`;
    } else {
        const forum_display_messages = document.createElement("div");
        forum_display_messages.classList.add("forum_display_messages");
        const forum_display_user = document.createElement("div");
        forum_display_user.classList.add("forum_display_user");
        const img = document.createElement("img");
        img.src = '../../../../SVG/avatar.svg';
        const a = document.createElement("a");
        a.textContent = data.username;
        forum_display_user.appendChild(img);
        forum_display_user.appendChild(a);

        const forum_display_user_message = document.createElement("div");
        forum_display_user_message.classList.add("forum_display_user_message");

        const forum_display_user_message_data = document.createElement("div");
        forum_display_user_message_data.classList.add("forum_display_user_message_data");
        const message_name = document.createElement("p");
        message_name.classList.add("message_name");
        const message_datetime = document.createElement("p");
        message_datetime.classList.add("message_datetime");
        message_name.textContent = data.message;
        message_datetime.textContent = format_date(Date.now(), 'Europe/Paris', 'fr-FR');

        forum_display_user_message_data.appendChild(message_name);
        forum_display_user_message_data.appendChild(message_datetime);

        forum_display_user_message.appendChild(forum_display_user_message_data);

        forum_display_messages.appendChild(forum_display_user);
        forum_display_messages.appendChild(forum_display_user_message);

        forum_messages.appendChild(forum_display_messages);

        // générer id aléatoire côté serveur lors de la connexion a passport, puis l'envoyer au client
        // et comparer la valeur du cookie aux données de l'utilisateur sur le serveur

    }

    /*const clone = document.querySelector(".forum_display_messages").cloneNode(true);
    clone.querySelector(".message_username").textContent = `${data.username}`;
    clone.querySelector(".message_name").textContent = `${data.message}`;
    forum_messages.appendChild(clone);*/

})

forum_post_messages.addEventListener("submit", function(event){
    event.preventDefault();
    messages_errors.className = "";
    messages_errors.textContent = "";

    const data = {message : forum_post_message.value.trim(), question : dataset};

    if (data.message === ""){
        messages_errors.classList.add("failure", "oe");
        messages_errors.textContent = "Le message est invalide";
    } else {
        socket.emit("forum_new_message", data);
        forum_post_message.value = "";
        forum_post_message.focus();
    }
})





function format_date(date, timeZone, lang){
    const options = {
        year : "numeric",
        month : "long",
        day : "numeric",
        weekday : "long",
        hour : "numeric",
        minute : "numeric",
        second : "numeric",
        timeZone : timeZone
    };

    const new_date = new Intl.DateTimeFormat(lang, options);
    return new_date.format(date);
}