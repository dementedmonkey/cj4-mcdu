# Design notes

This all works very similarly to the FBW implementation.
Their documentation is currently TODO, so I'm making a few notes 
here about how it works for my own sanity.

The server will run on two ports.  Port 8126 is the web server
which just serves up the HTML and javascript.   Port 8081 is the
web socket server.   The web socket server is basically a mirror.
Any message it receives is echoed out to all listeners.

These ports are one higher than the corresponding ports in FBW
so that the two mods don't step on each other.

### Messages
The following messages may be sent:
* **mcduConnected**  Sent when the sim connects to the server
* **requestUpdate**  Sent by the app to request the data immediately instead of waiting for the next change
* **event:_keyName_** A keypress event sent by the app
* **update:{_json_}** The current state of the MCDU screen, sent by the sim

### JSON schema
The screen display is JSON as follows:
```json
{
    "left": {
        "lines":[
            ["left","right","center"],
            ["left","right","center"],
            // 0 to 12 lines
        ],
        "scratchpad": "scratchpad text",
        "message":"Bottom row message",
        "title": "Screen title",
        "titleLeft": "Top-left title",
        "page": "1/2",
        "exec": false,
        "power": true
    },
    "right": {
        // same as the left
    }
}
```
Currently both `left` and `right` are the same in the sim, 
and only `left` is used by the app.

`lines`  has between 0 and 12 lines describing the
text to show on the display, 2 lines per row of buttons.
It is an array of the values to display in the left, right, and
center columns respectively.   Missing rows or columns are
OK, and will be treated as blank.

`scratchpad` is normally the text to display on the scratchpad.
This can also be supplied as an array, `[ "text", "center"]`
which can be used for displaying error messages.

`exec` indicates whether the EXEC indication should be shown
on the lower-right corner of the display

`power` indicates the power state of the MCDU.  If this is `false`
the screen will be blank

The encoding of text lines is unchanged from how the CJ4 stores
them natively, and is different that what the A320 uses.
The text of the line can contain a style in square brackets.
This style will apply to the preceding text on the line, such as
`KJFK [green]` or `123 [magenta][small]`



