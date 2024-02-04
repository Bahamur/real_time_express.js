const socket = io();
const blooper_fate = document.getElementById('blooper_fate');
const blooper_choice = document.querySelectorAll('.blooper_choice');
const content = document.getElementById('content');
const blooper_1_content = document.getElementById('blooper_1_content');
const blooper_2_content = document.getElementById('blooper_2_content');

blooper_choice.forEach(choice => {
    choice.addEventListener('click', function(){
        const user_choice = choice.id; // acteur ou spectateur
        socket.emit('join_blooper_room', user_choice); // rejoindre un duel
        blooper_fate.classList.add('move_up');
        setTimeout(function(){
          blooper_fate.style.display = 'none'; // on le cache après l'animation qui le coulisse vers le haut
        }, 350);
    })
})

socket.on('send_user_role', function(user_role){
  const role = user_role;
  // on affiche l'interface

})


setTimeout(function(){
  //envoyer la blague toutes les 5 secondes pour ne pas que les spectateurs s'ennuient
}, 5000);

/*
socket.on('send_user_role', function(user_role){
  const role = user_role;
  if (role === 'actor'){
    // création des éléments
    const bloopers_container = document.createElement('div');
    const write = document.createElement('input');
    write.type = 'text';
    write.placeholder = "Écrivez votre blague ici. N'oubliez pas, le monde entier vous regarde...";
    const send_blooper = document.createElement('button');
    send_blooper.textContent = 'Envoyer';
    // on ajoute les éléments au div
    bloopers_container.appendChild(write);
    bloopers_container.appendChild(send_blooper);
    content.appendChild(bloopers_container);
    send_blooper.onclick = function(){
      socket.emit('actor_blooper', write.value);
    }
  } else {
    const vote_container = document.createElement('div');
    const [blooper_1, blooper_2] = Array.from({length : 2}, function(){
      const select_best = document.createElement('div');
      select_best.classList.add('select_best_blooper');
      return select_best;
    })
    blooper_1.id = 'blooper_1';
    blooper_2.id = 'blooper_2';
    vote_container.appendChild(blooper_1);
    vote_container.appendChild(blooper_2);
    content.appendChild(vote_container);
  }
})
*/

// Afficher les blagues
socket.on('send_blooper_to_all', function(blooper){
  const actor_blooper = blooper;
  const display_blooper = document.createElement('p');
  display_blooper.textContent = actor_blooper;
  content.appendChild(display_blooper);
})


// Gérer les erreurs
socket.on('unauthorized', function(error){
  const display_error = document.createElement('p');
  display_error.textContent = error;
  content.appendChild(display_error);
})

