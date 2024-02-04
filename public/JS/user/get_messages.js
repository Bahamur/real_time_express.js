const about_grouped_message = document.querySelectorAll(".about_grouped_message");

about_grouped_message.forEach(message => {
    message.addEventListener("click", function(){
        console.log(`Message : ${message.textContent}`);
    })
})