const forum_sub_cat_group = document.querySelectorAll(".forum_sub_cat_group");
forum_sub_cat_group.forEach(subcat => {
    subcat.addEventListener("click", function(){
        location.href = `${location.pathname}/${subcat.id}`;
    })
})