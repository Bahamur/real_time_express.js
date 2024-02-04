const socket = io();

// récupérer les éléments par leur id
const forum_post = document.getElementById("forum_post");
const forum_post_title = document.getElementById("forum_post_title");
const forum_post_description = document.getElementById("forum_post_description");
const forum_post_submit = document.getElementById("forum_post_submit");
const forum_post_errors = document.getElementById("forum_post_errors");


// les couleurs qui servent aux catégories
const colors = ["#9e2718", "#9c690c", "#8a873b", "#537329", "#0d691a", "#0b615b", "#085087", "#41278f", "#75158f", "#8f0b67"];

// la sous-catégorie choisie
let chosen_category = "";
let chosen_sub_category = "";




// on récupère les sous catégories
const subcat = document.querySelectorAll(".subcat");

// on récupère les descriptions des sous catégories
const sub_categories_descriptions = document.querySelectorAll(".sub_category_description");

// on récupère les catégories principales
const categories = document.querySelectorAll(".category");

// on peint les catégories
for (let color = 0; color < categories.length; color++){
    categories[color].style.backgroundColor = colors[color % colors.length];
}




categories.forEach(category => {
    category.addEventListener("click", function(){

        // vérifier si la catégorie est sélectionnée
        const is_selected = this.classList.contains("selected");


        // 1 -> on réinitialise la sous catégorie sélectionnée
        subcat.forEach(sub_cat => {
            sub_cat.classList.remove("selected");
        })

        // 2 -> on cache les descriptions des sous catégories
        subcat.forEach(desc => {
            desc.classList.add("hide");
        })

        // 3 -> on cache les descriptions
        sub_categories_descriptions.forEach(desc => {
            desc.classList.add("hide");
        })

        // 4 -> on supprime la classe "selected" de chaque catégorie
        categories.forEach(cat => {
            cat.classList.remove("selected");
        })

        // 5 -> on ajoute la classe "selected" à la catégorie cliquée, sauf si elle est déjà sélectionnée
        if (!is_selected){
            this.classList.toggle("selected");
            // 6 -> on affiche ou on cache les sous catégories associées, sauf si la catégorie est déjà sélectionnée
            document.querySelectorAll(`.subcat${category.id}`).forEach(sub_cat => {
                sub_cat.classList.toggle("hide");
            })

            // 7 -> on réinitialise le choix de la sous-catégorie et on affecte la variable chosen_category
            chosen_sub_category = "";
            chosen_category = category.textContent;
        }
    })
})



// on s'occupe des sous-catégories
subcat.forEach(sub_cat => {
    sub_cat.addEventListener("click", function(){

        // 1 -> on supprime la classe "selected" de chaque sous catégorie
        subcat.forEach(sub => {
            sub.classList.remove("selected");
        })
        // 2 -> on ajoute la classe "selected" à la sous catégorie cliquée
        sub_cat.classList.add("selected");

        // 3 -> on stocke le contenu de la sous catégorie
        chosen_sub_category = sub_cat.textContent;

        // 4 -> on affiche ou on cache la description de la sous catégorie
        document.getElementById(`subdesc${sub_cat.id}`).classList.toggle("hide");
    })
})



// soumettre les données du formulaire
forum_post.addEventListener("submit", function(event){
    event.preventDefault();

    const title = forum_post_title.value.trim();
    const description = forum_post_description.value.trim();
    const sub_category = chosen_sub_category.trim();
    const category = chosen_category.trim();

    if (title === "" || description === "" || category === "" || sub_category === ""){
        forum_post_errors.classList.add("failure", "oe");
        forum_post_errors.textContent = `Veuillez remplir tous les champs puis sélectionner une catégorie`;
        window.scrollTo({
            top : 0,
            behavior : "smooth"
        });
    } else {
        fetch("/forum/forum_post", {
            method : "post",
            headers : {
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({ title, description, category, sub_category }),
            credentials : "same-origin"
        })
    
        .then(res => res.json())
        .then(data => {
            window.scrollTo({
                top : 0,
                behavior : "smooth"
            });
            forum_post_errors.className = "";
            if (data.correct){
                forum_post_errors.classList.add("success", "oe");
                forum_post_errors.textContent = `${data.success}`;
            } else {
                forum_post_errors.classList.add("failure", "oe");
                forum_post_errors.textContent = `${data.error}`;
            }
        })
    
        .catch(error => {
            forum_post_errors.classList.add("failure", "oe");
            forum_post_errors.textContent = `Une erreur est survenue`;
        })
    }

    
})
