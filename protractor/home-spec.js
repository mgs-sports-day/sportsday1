describe("SD: Home", () => {

    beforeEach(() => {
        browser.get("http://localhost"); // **assumes you're using localhost:80**
    });

    it("should have a title", () => {
        expect(browser.getTitle()).toEqual("MGS Sports Day 2018"); // this needs to be changed if the title changes
    });

    it("should have auto-reloading activated", () => {
        let timerEl = element(by.id("sd-test-timer"));
        let timerChildEl = timerEl.element(by.tagName("div"));

        expect(timerChildEl.getText()).toContain("Data reloading in");
        expect(timerChildEl.getText()).toContain("second");
    });

    it("auto-reloading should count down", done => {
        setTimeout(() => {
            expect(element(by.id("sd-test-timer-counter")).getText()).toBeLessThanOrEqual(51);
            done();
        }, 10000);
    });

    it("should show 5 forms on first tab", () => {
        let elements = element.all(by.css(".sd-test-top5"));
        expect(elements.count()).toEqual(5);
    });

    it("should show show 33 forms on second tab", () => {
        let elements = element.all(by.css(".sd-test-topAll"));
        expect(elements.count()).toEqual(33);
    });

    it("should have 7B as the first form", () => { // this test only applies when no data is used!!!
        let firstForm = element(by.css(".sd-test-top5Form"));
        expect(firstForm.getText()).toEqual("7B");
    });

    it("should be able to dismiss cookie message", done => {
        let cookieButton = element(by.css(".cc-dismiss"));
        let cookieMessage = element(by.css(".cc-window"));

        cookieButton.click();
        setTimeout(() => {
            expect(cookieMessage.getAttribute("style")).toContain("display: none;");
            done();
        }, 4000);
    });

    it("should be able to open 7B form page", () => {
        let formButton = element(by.css(".sd-test-top5FormButton"));
        formButton.click();
        expect(browser.getCurrentUrl()).toEqual("http://localhost/#!/f/7B");

        let formHeader = element(by.tagName("h3"));
        expect(formHeader.getText()).toEqual("7B");
    });
});