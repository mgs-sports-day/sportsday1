describe("SD: Home", () => {

    beforeEach(() => {
        browser.get("http://localhost/#!/about"); // **assumes you're using localhost:80**
    });

    it("should load breadcrumb", () => {
        let breadCrumbItem = element(by.css(".breadcrumb-item.active"));
        expect(breadCrumbItem.getText()).toEqual("About");
    });

    it("should pause auto-reloading", () => {
        let pausedEl = element(by.css(".sd-test-timerPaused"));
        expect(pausedEl.getText()).toEqual("Auto reloading paused on this page.");
    });
});