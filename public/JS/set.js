const user_container = document.getElementById("user_container");
const toggle_user_menu = document.getElementById("toggle_user_menu");

user_container.addEventListener("click", function(){
    toggle_user_menu.classList.toggle("hide");
})