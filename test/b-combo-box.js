var mouse = effroi.mouse;

function createCombo() {
    var combo = document.createElement('b-combo-box');
    var datalist = document.createElement('b-datalist');
    datalist.setAttribute('id', 'data');
    combo.setAttribute('list', 'data');
    datalist.innerHTML='<option value="first"></option><option value="second"></option>';
    document.body.appendChild(combo);
    document.body.appendChild(datalist);

    return combo;
}

describe("b-combo-box", function() {
    describe("when cliking on b-combo box", function() {
        it("should toggle suggestionList", function() {
            var combo = createCombo();

            mouse.click(combo.querySelector('.b-combo-box-toggle'));

            var isVisible = combo.suggestionList.hasAttribute('visible');
            assert.equal(isVisible, true);
        });
    });
});