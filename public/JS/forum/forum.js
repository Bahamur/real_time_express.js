const forum_home_category = document.querySelectorAll(".forum_home_category");
forum_home_category.forEach(category => {
    category.addEventListener("click", function(){
        location.href = `/forum/${category.id}`;
    })
})