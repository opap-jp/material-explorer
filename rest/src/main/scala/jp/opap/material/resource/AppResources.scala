package jp.opap.material.resource

import java.util.UUID

import akka.Done
import akka.actor.ActorRef
import akka.http.scaladsl.marshalling.sse.EventStreamMarshalling.toEventStream
import akka.http.scaladsl.model.HttpMethods._
import akka.http.scaladsl.model.sse.ServerSentEvent
import akka.http.scaladsl.model.{HttpEntity, MediaTypes, StatusCodes}
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import akka.stream.scaladsl.Source
import akka.stream.{CompletionStrategy, OverflowStrategy}
import ch.megard.akka.http.cors.scaladsl.CorsDirectives.cors
import ch.megard.akka.http.cors.scaladsl.settings.CorsSettings
import de.heikoseeberger.akkahttpcirce.FailFastCirceSupport
import io.circe.generic.auto._
import io.circe.syntax._
import jp.opap.material.MaterialExplorer.ServiceBundle
import jp.opap.material.dao.{MongoComponentDao, MongoRepositoryDao, MongoThumbnailDao}
import jp.opap.material.facade.RepositoryDataEventEmitter
import jp.opap.material.facade.RepositoryDataEventEmitter.{Progress, ProgressListener}
import jp.opap.material.resource.AppResources.CORS_SETTINGS

import scala.concurrent.ExecutionContext

class AppResources(val services: ServiceBundle, val eventEmitter: RepositoryDataEventEmitter)
  (implicit executionContext: ExecutionContext)
  extends /* SprayJsonSupport with */ FailFastCirceSupport {

  val projectDao: MongoRepositoryDao = services.repositoryDao
  val componentDao: MongoComponentDao = services.componentDao
  val thumbnailDao: MongoThumbnailDao = services.thumbnailDao

  val route: Route = cors(CORS_SETTINGS) {
    concat(
      pathPrefix("repositories") {
        get {
          val items = this.projectDao.find()
          val data = Map("items" -> items)
          complete(data.asJson)
        }
      },
      path("images") {
        get {
          val items = this.componentDao.findImages()
          val data = Map("items" -> items)
          complete(data.asJson)
        }
      },
      path("thumbnail" / Segment) { fileId =>
        get {
          val id = UUID.fromString(fileId)
          try {
            val blobId = this.componentDao.findFileById(id).get.blobId
            val thumbnail = this.thumbnailDao.findData(blobId).get
            complete(HttpEntity(MediaTypes.`image/png`, thumbnail))
          } catch {
            case _: NoSuchElementException => complete(StatusCodes.NotFound)
          }
        }
      },
      path("progress") {
        get {
          complete {
            // TODO: テストが必要です
            Source
              .actorRef(
                completionMatcher = { case Done => CompletionStrategy.immediately },
                failureMatcher = PartialFunction.empty,
                bufferSize = 100,
                overflowStrategy = OverflowStrategy.dropHead,
              ).mapMaterializedValue(doProgress)
          }
        }
      },
    )
  }

  def doProgress(actorRef: ActorRef): Unit = {
    if (eventEmitter.getRunning) {
      eventEmitter.subscribe(new ProgressListener {
        override def onUpdate(progress: Progress): Unit = {
          actorRef ! ServerSentEvent(progress.asJson.toString)
        }

        override def onFinish(): Unit = {
          actorRef ! ServerSentEvent("close", "close")
          actorRef ! Done
        }
      })
    } else {
      actorRef ! ServerSentEvent("negative", "negative")
      actorRef ! Done
    }
  }
}

object AppResources {
  val CORS_SETTINGS: CorsSettings = CorsSettings.defaultSettings
    .withAllowedMethods(Seq(GET, POST, PUT, DELETE, OPTIONS).to)
}
