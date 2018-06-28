import os
import re
from tempfile import mkdtemp
from flask import Flask, jsonify, render_template, request, session
from flask_session import Session
from werkzeug.exceptions import default_exceptions
from werkzeug.security import check_password_hash, generate_password_hash


from cs50 import SQL
from helpers import lookup, login_check

# Configure application
app = Flask(__name__)

# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///travelogue.db")

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)


# Ensure responses aren't cached
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


@app.route("/")
def index():
    # Show index html page
    return render_template("index.html")


@app.route("/loginCheck")
def loginCheck():
    # get the userID and pass as message
    return jsonify({"user_id": session.get("user_id")})


@app.route("/update")
def update():
    # getting location data from the database
    rows = []

    # getting park locations
    parksQuery = """SELECT name, latitude, longitude, locationType, case when u.id is null then 'N' else 'Y' end as is_visited FROM parksUS p LEFT JOIN userPlace u on u.parks_placeid = p.id and u.id = :user_id"""

    # getting city locations
    citiesQuery = """SELECT name, latitude, longitude, locationType, case when u.id is null then 'N' else 'Y' end as is_visited FROM citiesUS c LEFT JOIN userPlace u on u.places_placeid = c.id and u.id = :user_id"""

    # Return selected checkboxes
    if request.args.get('nationalParkCheck') == "true":
        rows = rows + db.execute(parksQuery, user_id=session.get("user_id"))

    if request.args.get('cityCheck') == "true":
        rows = rows + db.execute(citiesQuery, user_id=session.get("user_id"))

    return jsonify(rows)


@app.route("/passwordCheck")
def passwordCheck():
    message = ""

    # Check for parameters
    if not request.args.get('username') or not request.args.get('password'):
        message = "Enter Username / Password"

    # Conditions for new users
    else:
        if request.args.get('caller') == "registerButton":
            # check if the user already exists
            rows = db.execute("SELECT id from users where username =:username", username=request.args.get("username"))
            if len(rows) == 1:
                message = "Sorry. User already exists"
            elif not request.args.get('verify'):
                message = "Enter verification"
            elif request.args.get('verify') != request.args.get('password'):
                message = "Passwords do not match"

            # password conditions
            if message == "":
                password = request.args.get('password')
                if len(password) < 8 or len(password) > 32:
                    message = "Password should be between 8 and 32 long"
                elif re.search('[0-9]', password) is None:
                    message = "Password should have atleast one number"
                elif re.search('[A-Z]', password) is None:
                    message = "Password should have atleast one UPPER CASE letter"
                elif re.search('[a-z]', password) is None:
                    message = "Password should have atleast one lower case letter"
                elif re.search('[a-z]', password) is None:
                    message = "Password should have atleast one lower case letter"
                elif re.search(r"[ !#$%&'()*+,-./[\\\]^_`{|}~" + r'"]', password) is None:
                    message = "Password should contain atleast 1 special character"
                else:
                    hashed_pwd = generate_password_hash(password, method='pbkdf2:sha512')
                    db.execute("INSERT INTO users (username, passwordHashed) values (:username, :hashed_pwd)",
                               username=request.args.get("username"), hashed_pwd=hashed_pwd)
                    message = "Successfully registered. Please login"

        # Conditions for existing users
        elif request.args.get('caller') == "loginButton":
            # check if the user already exists
            rows = db.execute("SELECT id from users where username =:username",
                              username=request.args.get("username"))

            # Return error if user does not exits
            if len(rows) != 1:
                message = "Sorry. User does not exist. Please register"
            # Check if password is entered
            elif request.args.get('password') is None:
                message = "Enter password"
            # check if passwords match
            else:
                rows = db.execute("SELECT passwordHashed from users where username =:username",
                                  username=request.args.get("username"))
                if not check_password_hash(rows[0]["passwordHashed"], request.args.get("password")):
                    message = "Incorrect password"
                else:
                    message = "Successfully logged in"
                    rows = db.execute("SELECT id from users where username =:username", username=request.args.get("username"))
                    session["user_id"] = rows[0]["id"]

        else:
            message = "unknown error"

    return jsonify({'message': message})


@app.route("/logout")
def logout():
    # Forget the UserID
    session.clear()
    message = "Successfully logged out"

    return jsonify({"message": message})


@app.route("/locationEdit")
def locationEdit():
    # Editing the location based on the check box selection
    message = "unknown"

    # Add the location to user's history
    if session.get("user_id") != None:
        # get location status from database
        if request.args.get("locationType") == "park":
            locationID = db.execute("SELECT id from parksUS where name = :name", name=request.args.get("name"))[0]["id"]
            if request.args.get("checked") == "true":
                db.execute("INSERT INTO userPlace (id, parks_placeid, places_placeid) values (:userID, :parksID, 0)",
                           userID=session.get("user_id"), parksID=locationID)
                message = "inserted park"
            elif request.args.get("checked") == "false":
                db.execute("DELETE from userPlace where id = :userID and parks_placeid = :parksID",
                           userID=session.get("user_id"), parksID=locationID)
                message = "deleted park"

            else:
                message = "unknown"

        elif request.args.get("locationType") == "city":
            locationID = db.execute("SELECT id from citiesUS where name = :name", name=request.args.get("name"))[0]["id"]
            if request.args.get("checked") == "true":
                db.execute("INSERT INTO userPlace (id, parks_placeid, places_placeid) values (:userID, 0, :placesID)",
                           userID=session.get("user_id"), placesID=locationID)
                message = "inserted city"
            elif request.args.get("checked") == "false":
                db.execute("DELETE from userPlace where id = :userID and places_placeid = :placesID",
                           userID=session.get("user_id"), placesID=locationID)
                message = "deleted city"

            else:
                message = "unknown"

        else:
            message = "unknown"

    return jsonify({"message": message})


@app.route("/getUserStats")
def getUserStats():
    # get user visit stats from the database
    rows = db.execute("""SELECT count(distinct u.parks_placeID) as park, count(distinct places_placeID) as city, count(distinct c.state) as state from userPlace u left join citiesUS c on u.places_placeID = c.id where u.id = :userID """,
                      userID=session.get("user_id"))
    return jsonify(rows)
