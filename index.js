const { Plugin } = require('powercord/entities');
const { getModule, React, FluxDispatcher } = require("powercord/webpack");
const { findInReactTree } = require("powercord/util");
const { inject, uninject } = require("powercord/injector");

const ReactionButton = require("./components/ReactionButton");

let addedListener = false;
let emojiPickerMessage = "";

module.exports = class showAllMessageButtons extends Plugin {
    startPlugin() {
        this.addButtons();
    }

    pluginWillUnload() {
        uninject("forced-buttons")
        document
            .querySelectorAll(".reaction-button")
            .forEach((e) => (e.style.display = "none"));
    }

    async addButtons() {
        const MiniPopover = await getModule(
            (m) => m?.default?.displayName === "MiniPopover"
        );
        inject("forced-buttons", MiniPopover, "default", (_, res) => {
            let props = findInReactTree(res, (r) => r?.message);
            if (!props) return res;

            // Not sure why I need to do this, but it doesn't work otherwise
            props = res.props.children[res.props.children.length-1].props;

            props.expanded = true;

            if (props.message.id == emojiPickerMessage) {
                props.showEmojiPicker = true;
                if (!addedListener) {
                    addedListener = true;

                    const pickerClick = (event) =>  {
                        console.log(event);
                        const onPicker = event.path.filter(
                                            (element) => element.id == "emoji-picker-tab-panel"
                                        ).length == 1
                            
                        console.log(onPicker, event.shiftKey);

                        if ((onPicker && !event.shiftKey) || !onPicker) {
                            removePickerClick();
                            addedListener = false;
                            emojiPickerMessage = "";

                            setTimeout(() => {
                                this.updateMessage(props.message, false);
                            }, 0);
                        }
                    };
                    const removePickerClick = () => {
                        document.body.removeEventListener("click", pickerClick);
                    }

                    document.body.addEventListener("click", pickerClick);
                }
            }

            if (props.canReact) {
                res.props.children.splice(res.props.children.length-1, 0,
                        React.createElement(ReactionButton, {
                            showEmojiPicker: (show) => {
                                this.updateMessage(props.message, show);
                            }
                        })
                )
            }
            return res;
        });
        MiniPopover.default.displayName = "MiniPopover";
    }

	updateMessage(message, showEmojiPicker) {
		emojiPickerMessage = showEmojiPicker ? message.id : "";
		FluxDispatcher.dirtyDispatch({
			type: "MESSAGE_UPDATE",
			message,
		});
	}
}