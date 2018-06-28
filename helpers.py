import csv
import os
import urllib.request
import feedparser
import urllib.parse
from functools import wraps
from flask import redirect, render_template, request, session

def lookup(geo):
    """Look up articles for geo"""

    # Check cache
    try:
        if geo in lookup.cache:
            return lookup.cache[geo]
    except AttributeError:
        lookup.cache = {}

    # Replace special characters
    escaped = urllib.parse.quote(geo, safe="")

    # Get feed from Google
    feed = feedparser.parse(f"https://news.google.com/news/rss/local/section/geo/{escaped}")

    # If no items in feed, get feed from Onion
    if not feed["items"]:
        feed = feedparser.parse("http://www.theonion.com/feeds/rss")

    # Cache results
    lookup.cache[geo] = [{"link": item["link"], "title": item["title"]} for item in feed["items"]]

    # Return results
    return lookup.cache[geo]

def login_check(f):
    """
    Decorate routes to require login.

    http://flask.pocoo.org/docs/0.12/patterns/viewdecorators/
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("user_id") is None:
            return "None"
        return f(*args, **kwargs)
    return decorated_function
