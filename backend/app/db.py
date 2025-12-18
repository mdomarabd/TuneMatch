from pymongo import MongoClient
from backend.app.config import settings
from bson import ObjectId
import certifi
import dns.resolver
import ssl

# Fix for DNS timeouts on some networks (e.g. University WiFi)
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8']

class Database:
    client: MongoClient = None
    db = None

    @staticmethod
    def object_id(oid: str):
        return ObjectId(oid)

    @staticmethod
    def connect_db():
        """Connect to MongoDB Atlas"""
        # Reverting to simple permissive mode.
        # If this fails, it's a network block (firewall).
        client = MongoClient(settings.MONGO_URI, tlsAllowInvalidCertificates=True)
        Database.client = client
        Database.db = client[settings.DATABASE_NAME]
        print("MongoDB connected!")

    @staticmethod
    def disconnect_db():
        """Disconnect from MongoDB"""
        if Database.client:
            Database.client.close()
            print("MongoDB disconnected")

    @classmethod
    def get_db(cls):
        """Get the database instance, connect if not already connected"""
        if cls.db is None:
            cls.connect_db()
        return cls.db

    @classmethod
    def get_collection(cls, collection_name: str):
        """Get a specific collection from the database"""
        db = cls.get_db()
        return db[collection_name]
