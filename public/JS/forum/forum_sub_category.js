const forum_current_sub_category_questions = document.querySelectorAll(".forum_current_sub_category_questions");
forum_current_sub_category_questions.forEach(question => {
    question.addEventListener("click", function(){
        const dataset = question.dataset.questionName;
        location.href = `${location.pathname}/${encodeURIComponent(dataset)}`;
    })
});