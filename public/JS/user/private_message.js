const socket = io();

const form_private_message = document.getElementById("form_private_message");
const private_message_receiver = document.getElementById("private_message_receiver");
const private_message = document.getElementById("private_message");
const private_message_errors = document.getElementById("private_message_errors");
const available_receivers = document.getElementById("available_receivers");
const notifications = document.querySelector('.notifications');

let got_click = false;

socket.on('send_message_receipt', function(data){
    private_message_errors.className = '';
    if (data.correct){
        private_message_errors.classList.add("success", "oe");
        private_message_errors.textContent = `${data.success}`;
    } else {
        private_message_errors.classList.add("failure", "oe");
        private_message_errors.textContent = `${data.error}`;
    }
})

socket.on('message', function(data){
    notifications.classList.add('notifications', 'oe');
    notifications.textContent = "Vous avez reçu un message";
    setTimeout(function(){
        notifications.classList.add('hide');
    }, 4000);
})

private_message_receiver.addEventListener('focus', function(){
    got_click = true;
})

private_message_receiver.addEventListener('blur', function(event){
    if (got_click){
        const receiver = event.target.value.trim();
        if (receiver.length >= 2){
            fetch('/utilisateur/about_receiver', {
                method : 'post',
                headers : {
                    'Content-Type' : 'application/json'
                },
                body : JSON.stringify({receiver : receiver.trim()}),
                credentials : 'same-origin'
            })

            .then(res => res.json())
            .then(data => {
                if (data.correct){
                    if (data.users.length > 1){
                        available_receivers.textContent = 'Destinataires : ';
                    } else if (data.users.length == 1){
                        available_receivers.textContent = 'Destinataire : ';
                    }
                    data.users.forEach(user => {
                        const li = document.createElement('li');
                        li.textContent = `${user.username}`;
                        available_receivers.appendChild(li);
                        // Quand on clique sur un des noms, on l'applique au formulaire
                        li.addEventListener('click', function(){
                            private_message_receiver.value = this.textContent;
                        })
                    })
                }
            })

            .catch(error => {
                console.log(error);
            })
        } else {

        }
    }
})


form_private_message.addEventListener("submit", function(event){
    event.preventDefault();
    private_message_errors.className = '';

    const message = {
        receiver : private_message_receiver.value.trim(),
        content : private_message.value.trim()
    };

    if (message.receiver === '' || message.content === ''){
        private_message_errors.classList.add("failure", "oe");
        private_message_errors.textContent = "Veuillez remplir tous les champs";
    } else {
        // Envoi du message privé
        socket.emit('send_private_message', message);
        // Réinitialisation du formulaire
        form_private_message.reset();
    }

})