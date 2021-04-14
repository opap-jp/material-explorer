package jp.opap.material

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import com.mongodb.MongoClient
import com.mongodb.client.MongoDatabase
import jp.opap.material.dao._
import jp.opap.material.facade.MediaConverter.RestResize
import jp.opap.material.facade.RepositoryDataEventEmitter
import jp.opap.material.resource.AppResources
import org.slf4j.{Logger, LoggerFactory}

import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext}

object MaterialExplorer {
  val logger: Logger = LoggerFactory.getLogger(getClass)

  def main(args: Array[String]): Unit = {
    implicit val actorSystem: ActorSystem = ActorSystem()
    implicit val executor: ExecutionContext = actorSystem.dispatcher

    try {
      run()
    } finally {
      actorSystem.terminate()
    }
  }

  def run()(implicit actorSystem: ActorSystem, executor: ExecutionContext): Unit = {
    val serviceBundle = resolveServiceBundle()
    val repositoryEventEmitter = new RepositoryDataEventEmitter()

    val resources = new AppResources(serviceBundle, repositoryEventEmitter)

    Http().bindAndHandle(resources.route, "0.0.0.0", 8080)
    logger.info("Started.")
    Await.result(actorSystem.whenTerminated, Duration.Inf)
  }

  def resolveServiceBundle(): ServiceBundle = {
    val dbClient = new MongoClient(requireValue("DATABASE_HOST"))
    val db = dbClient.getDatabase(requireValue("DATABASE_NAME"))

    val repositoryDao = new MongoRepositoryDao(db)
    val componentDao = new MongoComponentDao(db)
    val thumbnailDao = new MongoThumbnailDao(db)
    val cacheDao = new GridFsCacheDao(db)
    val resize = new RestResize(requireValue("IMAGEMAGICK_HOST"))

    new ServiceBundle(db, repositoryDao, componentDao, thumbnailDao, cacheDao, resize)
  }

  def requireValue(name: String): String = {
    System.getenv(name) match {
      case value: String => value
      case null => throw new IndexOutOfBoundsException(s"Environment variable ${name} is not set.")
    }
  }

  class ServiceBundle(
    val db: MongoDatabase,
    val repositoryDao: MongoRepositoryDao,
    val componentDao: MongoComponentDao,
    val thumbnailDao: MongoThumbnailDao,
    val cacheDao: CacheDao,
    val resize: RestResize
  )
}
